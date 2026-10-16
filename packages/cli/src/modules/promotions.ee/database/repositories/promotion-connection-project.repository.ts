import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { PromotionConnectionProject } from '../entities/promotion-connection-project.entity';
import { PromotionConflictError } from '../promotion-conflict.error';

@Service()
export class PromotionConnectionProjectRepository extends BaseRepository<PromotionConnectionProject> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PromotionConnectionProject, dataSource.manager, transactionRunner);
	}

	async findByProjectId(
		projectId: string,
		ctx: OperationContext = {},
	): Promise<PromotionConnectionProject | null> {
		return await this.managerFor(ctx).findOne(PromotionConnectionProject, {
			where: { projectId },
		});
	}

	/**
	 * Links a project without changing an existing link. Concurrent inserts race on
	 * the project primary key, and every caller then reads the link that won. A link
	 * held by another connection is a conflict; the same link again is a no-op.
	 */
	async linkProject(projectId: string, connectionId: string): Promise<PromotionConnectionProject> {
		const link = this.create({ projectId, connectionId });
		await this.createQueryBuilder().insert().values(link).orIgnore().execute();
		const stored = await this.findOneByOrFail({ projectId });
		if (stored.connectionId !== connectionId) {
			throw new PromotionConflictError(
				'project-link',
				'This project is already linked to another promotion connection',
			);
		}
		return stored;
	}

	/**
	 * Unlinks a project only if it still belongs to this connection. The primary key
	 * is `projectId` alone, so an entity-based remove would delete whichever link
	 * holds the project now, including one reassigned after the caller's read.
	 * Returns the number of links removed, so a lost race is distinguishable from a
	 * successful unlink.
	 */
	async unlinkProject(projectId: string, connectionId: string): Promise<number> {
		const result = await this.delete({ projectId, connectionId });
		return result.affected ?? 0;
	}

	/** Project IDs linked to a connection, ordered for a stable response. */
	async findProjectIdsByConnection(connectionId: string): Promise<string[]> {
		const rows = await this.find({
			where: { connectionId },
			select: { projectId: true },
			order: { projectId: 'ASC' },
		});
		return rows.map((row) => row.projectId);
	}
}
