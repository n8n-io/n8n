import type { AiPreferenceScope, AiPreferenceSortOption, AiPreferenceTarget } from '@n8n/api-types';
import { AI_PREFERENCE_MAX_PER_SCOPE } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull, Not, Raw } from '@n8n/typeorm';
import type { FindOptionsOrder, FindOptionsWhere } from '@n8n/typeorm';

import { AiPreference } from '../entities';
import { BaseRepository } from './base-repository';
import { DbLock } from '../services/db-lock.service';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { escapeLike, LIKE_ESCAPE_CLAUSE } from '../utils/escape-like';

/** `'all'` skips the filter. A full id list could exceed SQLite's bound-parameter limit. */
export type ReadableProjects = string[] | 'all';

export type ApplicableAiPreferencesQuery = {
	userId: string;
	projectIds: ReadableProjects;
};

export type VisibleAiPreferencesQuery = ApplicableAiPreferencesQuery & {
	/** For admins in settings. A prompt never sets it. */
	allUsers: boolean;
};

export type AiPreferencePageQuery = VisibleAiPreferencesQuery & {
	skip: number;
	take: number;
	/** Only these rows. Never widens what the caller may see. */
	ids?: string[];
	/** Case-insensitive substring of the content. Never widens what the caller may see. */
	search?: string;
	sortBy?: AiPreferenceSortOption;
	scope?: AiPreferenceScope;
};

@Service()
export class AiPreferenceRepository extends BaseRepository<AiPreference> {
	constructor(
		dataSource: DataSource,
		private readonly txRunner: TransactionRunner,
	) {
		super(AiPreference, dataSource.manager, txRunner);
	}

	/** Limit each scope in SQL so existing excess rows do not enter prompts. */
	async findApplicable(query: ApplicableAiPreferencesQuery): Promise<AiPreference[]> {
		const ranked = this.createQueryBuilder('candidate')
			.select('candidate.id', 'id')
			.addSelect(
				'ROW_NUMBER() OVER (PARTITION BY candidate.userId, candidate.projectId ORDER BY candidate.createdAt, candidate.id)',
				'scopePosition',
			)
			.where(visibleTo(query, false));
		return await this.createQueryBuilder('preference')
			.where(
				`preference.id IN (SELECT id FROM (${ranked.getQuery()}) ranked WHERE "scopePosition" <= :scopeLimit)`,
			)
			.setParameters({ ...ranked.getParameters(), scopeLimit: AI_PREFERENCE_MAX_PER_SCOPE })
			.orderBy('preference.createdAt', 'ASC')
			.addOrderBy('preference.id', 'ASC')
			.getMany();
	}

	/** Hold scope locks until all checks and writes commit. Moves lock both scopes. */
	async withWriteLock<T>(
		targets: AiPreferenceTarget[],
		ctx: OperationContext,
		write: (ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		return await this.txRunner.run(ctx, async (ctx) => {
			const manager = this.managerFor(ctx);
			// SQLite leases its single write connection for the transaction.
			if (manager.connection.options.type === 'postgres') {
				// Sort the lock IDs because distinct scopes can share a hash.
				const keys: Array<{ key: number }> = await manager.query(
					'SELECT DISTINCT hashtext(scope) AS key FROM unnest($1::text[]) AS scope ORDER BY key',
					[targets.map(scopeLockKey)],
				);
				for (const { key } of keys) {
					await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
						DbLock.AI_PREFERENCE_SCOPES,
						key,
					]);
				}
			}
			return await write(ctx);
		});
	}

	/** Refuse a write if the row changed after its permission check. */
	async assertUnchanged(previous: AiPreference, ctx: OperationContext): Promise<void> {
		const manager = this.managerFor(ctx);
		const current = await manager.findOne(AiPreference, {
			where: { id: previous.id },
			...(manager.connection.options.type === 'postgres'
				? { lock: { mode: 'pessimistic_write' as const } }
				: {}),
		});
		if (
			!current ||
			current.content !== previous.content ||
			current.userId !== previous.userId ||
			current.projectId !== previous.projectId ||
			current.updatedAt.getTime() !== previous.updatedAt.getTime()
		) {
			throw new ConflictError('The Preference changed. Reload it and try again.');
		}
	}

	async savePreference(row: AiPreference, ctx: OperationContext): Promise<AiPreference> {
		return await this.managerFor(ctx).save(AiPreference, row);
	}

	/** Wider than `findApplicable`: an admin sees rows that never reach their own prompts. */
	async findPageVisible(query: AiPreferencePageQuery): Promise<[AiPreference[], number]> {
		const visible = visibleTo(query, query.allUsers, query.scope);
		if (visible.length === 0) return [[], 0];
		const { ids, search } = query;
		// Each filter narrows every visibility branch, so it cannot reach past them.
		const narrowing: FindOptionsWhere<AiPreference> = {
			...(ids ? { id: In(ids) } : {}),
			...(search ? { content: containsIgnoringCase(search) } : {}),
		};
		return await this.findAndCount({
			where: visible.map((where) => ({ ...where, ...narrowing })),
			relations: RELATIONS,
			order: query.sortBy ? SORT_ORDERS[query.sortBy] : ORDER,
			skip: query.skip,
			take: query.take,
		});
	}

	async hasAny(): Promise<boolean> {
		return await this.exists();
	}

	async countVisible(query: VisibleAiPreferencesQuery): Promise<number> {
		return await this.count({ where: visibleTo(query, query.allUsers) });
	}

	/**
	 * Rows already saved for one target, so a write can be refused before it lands.
	 * Counts the target itself, not what a caller may see: a cap is a property of the
	 * scope, and an admin writing into another user's scope fills the same bucket.
	 */
	async countForTarget(target: AiPreferenceTarget, ctx: OperationContext = {}): Promise<number> {
		return await this.managerFor(ctx).count(AiPreference, { where: whereTarget(target) });
	}

	/** Exact-match duplicate probe for a write. Content is stored trimmed by the
	 *  request schema, so equality is the right comparison. `excludeId` lets an
	 *  edit ignore its own row. */
	async existsForTargetWithContent(
		target: AiPreferenceTarget,
		content: string,
		excludeId?: string,
		ctx: OperationContext = {},
	): Promise<boolean> {
		const count = await this.managerFor(ctx).count(AiPreference, {
			where: {
				...whereTarget(target),
				content,
				...(excludeId ? { id: Not(excludeId) } : {}),
			},
		});
		return count > 0;
	}

	/** No visibility filter. The service authorizes the row before it returns or acts on it. */
	async findByIdWithRelations(id: string): Promise<AiPreference | null> {
		return await this.findOne({ where: { id }, relations: RELATIONS });
	}
}

function scopeLockKey(target: AiPreferenceTarget): string {
	switch (target.scope) {
		case 'project':
			return `project:${target.projectId}`;
		case 'user':
			return `user:${target.userId}`;
		case 'instance':
			return 'instance';
	}
}

function whereTarget(target: AiPreferenceTarget): FindOptionsWhere<AiPreference> {
	switch (target.scope) {
		case 'project':
			return { projectId: target.projectId };
		case 'user':
			return { userId: target.userId };
		case 'instance':
			return { userId: IsNull(), projectId: IsNull() };
	}
}

const ORDER = { createdAt: 'ASC', id: 'ASC' } as const;

const SORT_ORDERS = {
	'updatedAt:asc': { updatedAt: 'ASC', id: 'ASC' },
	'updatedAt:desc': { updatedAt: 'DESC', id: 'DESC' },
} satisfies Record<AiPreferenceSortOption, FindOptionsOrder<AiPreference>>;

const RELATIONS = { project: true, user: true, createdBy: true } as const;

/**
 * The database applies `LOWER` to both sides, so the column and the term fold the same
 * way. Folding the term in JS would break exact-case matches of non-ASCII text on SQLite,
 * whose `LOWER` folds only ASCII.
 */
function containsIgnoringCase(term: string) {
	return Raw((column) => `LOWER(${column}) LIKE LOWER(:contentSearch) ${LIKE_ESCAPE_CLAUSE}`, {
		contentSearch: `%${escapeLike(term)}%`,
	});
}

function visibleTo(
	query: ApplicableAiPreferencesQuery,
	allUsers: boolean,
	scope?: AiPreferenceScope,
): Array<FindOptionsWhere<AiPreference>> {
	const where: Array<FindOptionsWhere<AiPreference>> = [];

	if (!scope || scope === 'instance') where.push({ userId: IsNull(), projectId: IsNull() });
	if (!scope || scope === 'user') {
		where.push(allUsers ? { userId: Not(IsNull()) } : { userId: query.userId });
	}
	if (!scope || scope === 'project') {
		if (query.projectIds === 'all') where.push({ projectId: Not(IsNull()) });
		// `In([])` is not valid SQL on every driver.
		else if (query.projectIds.length > 0) where.push({ projectId: In(query.projectIds) });
	}

	return where;
}
