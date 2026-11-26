import type { User } from '@n8n/db';
import { BinaryDataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { parseExecutionFileId, TEMP_EXECUTION_ID } from 'n8n-core';

import { WorkflowSharingService } from '@n8n/backend-services';

import { type ExecutionIdV2, isExecutionIdV1, isExecutionIdV2 } from '@/executions/execution-id';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

/**
 * Workflow that a binary derives its access from. Normally the workflow of the
 * execution that owns the binary, looked up by execution id. A binary written
 * before its execution row exists names its workflow in the file path. An
 * engine v2 execution has no row in the execution table, so the data plane
 * names its workflow.
 */
type AccessSource =
	| { type: 'execution'; executionId: string; workflowId?: string }
	| { type: 'workflow'; workflowId: string };

/**
 * Authorizes access to binary data. A binary belongs to an execution, so access
 * derives from `execution:read` on that execution's workflow.
 */
@Service()
export class BinaryDataAccessService {
	constructor(
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataRepository: BinaryDataRepository,
		private readonly dataPlane: EngineDataPlaneProxyService,
	) {}

	async assertIsAllowed(
		binaryDataId: string,
		workflowId: string | undefined,
		grantedIds?: string[],
	): Promise<void> {
		if (grantedIds?.includes(binaryDataId)) return;
		if (workflowId && (await this.isOwnedByWorkflow(workflowId, binaryDataId))) return;

		throw new UserError('This binary data is not available to the current workflow.');
	}

	/** Whether `user` may read the execution that owns `binaryDataId`. */
	async hasReadAccess(user: User, binaryDataId: string): Promise<boolean> {
		const source = await this.resolveAccessSource(binaryDataId);
		if (!source) return false;

		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['execution:read'],
		});

		if (source.type === 'workflow') return accessibleWorkflowIds.includes(source.workflowId);
		if (source.workflowId && !accessibleWorkflowIds.includes(source.workflowId)) return false;

		return await this.executionRepository.existsForAccessibleWorkflows(
			source.executionId,
			source.workflowId ? [source.workflowId] : accessibleWorkflowIds,
		);
	}

	/** Whether a binary belongs to an execution of `workflowId`. */
	async isOwnedByWorkflow(workflowId: string, binaryDataId: string): Promise<boolean> {
		const source = await this.resolveAccessSource(binaryDataId);
		if (!source) return false;

		if (source.type === 'workflow') return source.workflowId === workflowId;
		if (source.workflowId && source.workflowId !== workflowId) return false;

		return await this.executionRepository.existsForAccessibleWorkflows(source.executionId, [
			workflowId,
		]);
	}

	/**
	 * Resolve what a binary derives its access from, or null for binaries not tied
	 * to an execution (custom sources) or IDs that cannot be mapped to one.
	 */
	private async resolveAccessSource(binaryDataId: string): Promise<AccessSource | null> {
		const separatorIndex = binaryDataId.indexOf(':');
		if (separatorIndex === -1) return null;

		const mode = binaryDataId.substring(0, separatorIndex);
		const fileId = binaryDataId.substring(separatorIndex + 1);

		// database mode stores a bare uuid; the row carries the source
		if (mode === 'database') {
			const source = await this.binaryDataRepository.findSourceByFileId(fileId);
			if (source?.sourceType !== 'execution') return null;

			if (isExecutionIdV1(source.sourceId)) {
				return { type: 'execution', executionId: source.sourceId };
			}

			// The row names no workflow, so a temp placeholder has nothing to fall back on.
			return isExecutionIdV2(source.sourceId)
				? await this.resolveEngineV2Execution(source.sourceId)
				: null;
		}

		// filesystem / filesystem-v2 / s3 / azure embed the execution in the path
		const location = parseExecutionFileId(fileId);
		if (!location) return null;

		const { workflowId, executionId } = location;
		if (isExecutionIdV1(executionId)) {
			return { type: 'execution', executionId, workflowId };
		}

		// The workflow in the path authorizes reads before the execution exists.
		if (executionId === TEMP_EXECUTION_ID) return { type: 'workflow', workflowId };

		if (!isExecutionIdV2(executionId)) return null;

		// A stored file can outlive its execution.
		const source = await this.resolveEngineV2Execution(executionId);
		return source?.workflowId === workflowId ? source : null;
	}

	/**
	 * An engine v2 execution has no row in the execution table, so the data plane
	 * is asked which workflow the execution belongs to. Its steps are not needed.
	 * No data plane, or no such execution, means no access.
	 */
	private async resolveEngineV2Execution(
		executionId: ExecutionIdV2,
	): Promise<{ type: 'workflow'; workflowId: string } | null> {
		const execution = await this.dataPlane.getExecution(executionId);
		return execution ? { type: 'workflow', workflowId: execution.workflowId } : null;
	}
}
