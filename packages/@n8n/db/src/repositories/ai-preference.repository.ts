import type { AiPreferenceTarget } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import type { FindOptionsWhere } from '@n8n/typeorm';

import { AiPreference } from '../entities';
import { BaseRepository } from './base-repository';
import { TransactionRunner } from '../services/transaction';

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
};

@Service()
export class AiPreferenceRepository extends BaseRepository<AiPreference> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AiPreference, dataSource.manager, transactionRunner);
	}

	/** Oldest first, so the prompt text is stable across reads. */
	async findApplicable(query: ApplicableAiPreferencesQuery): Promise<AiPreference[]> {
		return await this.find({ where: visibleTo(query, false), order: ORDER });
	}

	/** Wider than `findApplicable`: an admin sees rows that never reach their own prompts. */
	async findPageVisible(query: AiPreferencePageQuery): Promise<[AiPreference[], number]> {
		return await this.findAndCount({
			where: visibleTo(query, query.allUsers),
			relations: RELATIONS,
			order: ORDER,
			skip: query.skip,
			take: query.take,
		});
	}

	async countVisible(query: VisibleAiPreferencesQuery): Promise<number> {
		return await this.count({ where: visibleTo(query, query.allUsers) });
	}

	/**
	 * Rows already saved for one target, so a write can be refused before it lands.
	 * Counts the target itself, not what a caller may see: a cap is a property of the
	 * scope, and an admin writing into another user's scope fills the same bucket.
	 */
	async countForTarget(target: AiPreferenceTarget): Promise<number> {
		return await this.count({ where: whereTarget(target) });
	}

	/** Exact-match duplicate probe for a write. Content is stored trimmed by the
	 *  request schema, so equality is the right comparison. `excludeId` lets an
	 *  edit ignore its own row. */
	async existsForTargetWithContent(
		target: AiPreferenceTarget,
		content: string,
		excludeId?: string,
	): Promise<boolean> {
		const count = await this.count({
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

const RELATIONS = { project: true, user: true } as const;

function visibleTo(
	query: ApplicableAiPreferencesQuery,
	allUsers: boolean,
): Array<FindOptionsWhere<AiPreference>> {
	const where: Array<FindOptionsWhere<AiPreference>> = [
		{ userId: IsNull(), projectId: IsNull() },
		allUsers ? { userId: Not(IsNull()) } : { userId: query.userId },
	];

	if (query.projectIds === 'all') where.push({ projectId: Not(IsNull()) });
	// `In([])` is not valid SQL on every driver.
	else if (query.projectIds.length > 0) where.push({ projectId: In(query.projectIds) });

	return where;
}
