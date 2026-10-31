import { WorkflowProjectService } from '@n8n/backend-services';
import {
	type ExecutionLedgerEndedFacts,
	type ExecutionLedgerStartedFacts,
	type ExecutionLedgerWriteResult,
	type ExecutionLedgerWriter,
	isEntityNotFoundError,
	type OperationContext,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { v7 as uuidv7 } from 'uuid';

import { ExecutionLedgerRepository } from './database/repositories/execution-ledger.repository';
import { toEndedRow, toStartedRow } from './ledger-row.mapper';

const NO_OWNER_PROJECT: ExecutionLedgerWriteResult = { recorded: false, reason: 'noOwnerProject' };

/** Bound to the core `ExecutionLedger` service by the module. */
@Service()
export class ExecutionLedgerRowWriter implements ExecutionLedgerWriter {
	constructor(
		private readonly repository: ExecutionLedgerRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowProjectService: WorkflowProjectService,
	) {}

	async writeStarted(
		facts: ExecutionLedgerStartedFacts,
		ctx: OperationContext,
	): Promise<ExecutionLedgerWriteResult> {
		const projectId = await this.findProjectId(facts.workflowId, ctx);
		if (!projectId) return NO_OWNER_PROJECT;

		await this.repository.append(toStartedRow(facts, projectId, uuidv7()), ctx);
		return { recorded: true };
	}

	async writeEnded(
		facts: ExecutionLedgerEndedFacts,
		ctx: OperationContext,
	): Promise<ExecutionLedgerWriteResult> {
		const projectId = await this.findProjectId(facts.workflowId, ctx);
		if (!projectId) return NO_OWNER_PROJECT;

		await this.repository.append(toEndedRow(facts, projectId, uuidv7()), ctx);
		return { recorded: true };
	}

	/**
	 * Reads on the transaction connection when there is one. A cache miss reads on a second
	 * connection, which deadlocks a single-connection pool inside a transaction.
	 */
	private async findProjectId(workflowId: string, ctx: OperationContext) {
		if (ctx.trx) {
			return (await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId, ctx))?.id;
		}

		try {
			return (await this.workflowProjectService.getWorkflowProjectCached(workflowId)).id;
		} catch (error) {
			if (isEntityNotFoundError(error)) return undefined;
			throw error;
		}
	}
}
