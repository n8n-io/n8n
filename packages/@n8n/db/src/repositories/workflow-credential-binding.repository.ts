import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { WorkflowCredentialBinding } from '../entities';
import { BaseRepository } from './base-repository';
import type { OperationContext } from '../services/transaction';

@Service()
export class WorkflowCredentialBindingRepository extends BaseRepository<WorkflowCredentialBinding> {
	constructor(dataSource: DataSource) {
		super(WorkflowCredentialBinding, dataSource.manager);
	}

	/**
	 * Record consent, or renew it after a revoke. `consentAt` moves either way, so
	 * the row always says when the standing grant began rather than when the pair
	 * was first seen.
	 */
	async grant(workflowId: string, userId: string, ctx: OperationContext = {}): Promise<void> {
		await this.managerFor(ctx).upsert(
			WorkflowCredentialBinding,
			{ workflowId, userId, status: 'active', consentAt: new Date() },
			['workflowId', 'userId'],
		);
	}

	/**
	 * Withdraw consent, keeping the row so the audit trail survives. Returns
	 * whether a grant was actually there to withdraw, which lets the caller skip
	 * the deprovisioning work when nothing changed.
	 */
	async revoke(workflowId: string, userId: string, ctx: OperationContext = {}): Promise<boolean> {
		const result = await this.managerFor(ctx).update(
			WorkflowCredentialBinding,
			{ workflowId, userId, status: 'active' },
			{ status: 'revoked' },
		);
		return (result.affected ?? 0) > 0;
	}

	async isActive(workflowId: string, userId: string, ctx: OperationContext = {}): Promise<boolean> {
		const count = await this.managerFor(ctx).countBy(WorkflowCredentialBinding, {
			workflowId,
			userId,
			status: 'active',
		});
		return count > 0;
	}

	/** The workflows this person currently lets run as them. */
	async findActiveWorkflowIdsForUser(
		userId: string,
		ctx: OperationContext = {},
	): Promise<string[]> {
		const rows = await this.managerFor(ctx).find(WorkflowCredentialBinding, {
			select: ['workflowId'],
			where: { userId, status: 'active' },
		});
		return rows.map((row) => row.workflowId);
	}
}
