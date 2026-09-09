import { Service } from '@n8n/di';
import { DataSource, In, IsNull } from '@n8n/typeorm';
import type { FindOptionsWhere } from '@n8n/typeorm';

import { AiPreference } from '../entities';
import { BaseRepository } from './base-repository';
import { TransactionRunner } from '../services/transaction';

export type ApplicableAiPreferencesQuery = {
	userId: string;
	/** The projects whose preferences the caller may read. */
	projectIds: string[];
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
		const where: Array<FindOptionsWhere<AiPreference>> = [
			{ userId: IsNull(), projectId: IsNull() },
			{ userId: query.userId },
		];
		// `In([])` is not valid SQL on every driver.
		if (query.projectIds.length > 0) where.push({ projectId: In(query.projectIds) });

		return await this.find({ where, order: { createdAt: 'ASC', id: 'ASC' } });
	}
}
