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

	/** No visibility filter. The service authorizes the row before it returns or acts on it. */
	async findByIdWithRelations(id: string): Promise<AiPreference | null> {
		return await this.findOne({ where: { id }, relations: RELATIONS });
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
