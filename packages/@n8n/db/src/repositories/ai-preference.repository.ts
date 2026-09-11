import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import type { FindOptionsWhere } from '@n8n/typeorm';

import { AiPreference } from '../entities';
import { BaseRepository } from './base-repository';
import { TransactionRunner } from '../services/transaction';

/**
 * The projects whose preferences the caller may read. `'all'` skips the filter
 * instead of listing every project id, which would outgrow the bound-parameter
 * limit of SQLite on a large instance.
 */
export type ReadableProjects = string[] | 'all';

export type ApplicableAiPreferencesQuery = {
	userId: string;
	projectIds: ReadableProjects;
};

export type AiPreferencePageQuery = ApplicableAiPreferencesQuery & {
	skip: number;
	take: number;
};

@Service()
export class AiPreferenceRepository extends BaseRepository<AiPreference> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AiPreference, dataSource.manager, transactionRunner);
	}

	/**
	 * Every preference that applies to one user: the instance-wide rows, the user's
	 * own rows, and the rows of the given projects. Oldest first, so the prompt text
	 * built from them is stable across reads.
	 */
	async findApplicable(query: ApplicableAiPreferencesQuery): Promise<AiPreference[]> {
		return await this.find({ where: visibleTo(query), order: ORDER });
	}

	/**
	 * One page of the same set, with the total, for the settings list. The page keeps
	 * the order the preferences reach a prompt in.
	 */
	async findPageApplicable(query: AiPreferencePageQuery): Promise<[AiPreference[], number]> {
		return await this.findAndCount({
			where: visibleTo(query),
			relations: { project: true },
			order: ORDER,
			skip: query.skip,
			take: query.take,
		});
	}

	/**
	 * One row by id, with no visibility filter: who may see it depends on project
	 * scopes this layer cannot resolve. Callers must authorize the row before they
	 * return it or act on it — `AiPreferenceService.requireVisible` is the one path
	 * that does, and it answers a row the caller may not see as a missing row.
	 */
	async findByIdWithProject(id: string): Promise<AiPreference | null> {
		return await this.findOne({ where: { id }, relations: { project: true } });
	}
}

const ORDER = { createdAt: 'ASC', id: 'ASC' } as const;

function visibleTo(query: ApplicableAiPreferencesQuery): Array<FindOptionsWhere<AiPreference>> {
	const where: Array<FindOptionsWhere<AiPreference>> = [
		{ userId: IsNull(), projectId: IsNull() },
		{ userId: query.userId },
	];

	if (query.projectIds === 'all') where.push({ projectId: Not(IsNull()) });
	// `In([])` is not valid SQL on every driver.
	else if (query.projectIds.length > 0) where.push({ projectId: In(query.projectIds) });

	return where;
}
