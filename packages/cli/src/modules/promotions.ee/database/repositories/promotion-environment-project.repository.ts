import type { PromotionDirection } from '@n8n/api-types';
import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { PromotionEnvironmentProject } from '../entities/promotion-environment-project.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

@Service()
export class PromotionEnvironmentProjectRepository extends BaseRepository<PromotionEnvironmentProject> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionEnvironmentProject, dataSource.manager, transactionRunner);
	}

	/**
	 * Loads the link with its environment and provider in one query, so an edit
	 * that lands between two reads cannot pair old credentials with a new remote.
	 */
	async findForProject(
		projectId: string,
		direction: PromotionDirection,
	): Promise<PromotionEnvironmentProject | null> {
		return await this.findOne({
			where: { projectId, direction },
			relations: { environment: { provider: true } },
		});
	}

	/**
	 * Links a project without changing an existing link. Concurrent inserts race on
	 * the (projectId, direction) primary key, and every caller then reads the link
	 * that won. A link held by another environment is a conflict; the same link
	 * again is a no-op.
	 */
	async linkProject(
		projectId: string,
		environmentId: string,
		direction: PromotionDirection,
	): Promise<PromotionEnvironmentProject> {
		const link = this.create({ projectId, environmentId, direction });
		await this.createQueryBuilder().insert().values(link).orIgnore().execute();
		const stored = await this.findOneByOrFail({ projectId, direction });
		if (stored.environmentId !== environmentId) {
			throw new PromotionConflictError(
				`This project already has a ${direction} promotion environment`,
			);
		}
		return stored;
	}

	/**
	 * Deletes by both keys, so a link reassigned after the caller's read survives.
	 * Returns 0 when the link no longer belongs to this environment.
	 */
	async unlinkProject(projectId: string, environmentId: string): Promise<number> {
		const result = await this.delete({ projectId, environmentId });
		return result.affected ?? 0;
	}

	async findProjectIdsByEnvironment(environmentId: string): Promise<string[]> {
		const rows = await this.find({
			where: { environmentId },
			select: { projectId: true },
			order: { projectId: 'ASC' },
		});
		return rows.map((row) => row.projectId);
	}
}
