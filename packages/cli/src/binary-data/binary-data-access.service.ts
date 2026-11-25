import type { User } from '@n8n/db';
import { BinaryDataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
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
type AccessSource = { executionId: string } | { workflowId: string };

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

	/** Whether `user` may read the execution that owns `binaryDataId`. */
	async hasReadAccess(user: User, binaryDataId: string): Promise<boolean> {
		const source = await this.resolveAccessSource(binaryDataId);
		if (!source) return false;

		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['execution:read'],
		});

		if ('workflowId' in source) return accessibleWorkflowIds.includes(source.workflowId);

		return await this.executionRepository.existsForAccessibleWorkflows(
			source.executionId,
			accessibleWorkflowIds,
		);
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

			if (isExecutionIdV1(source.sourceId)) return { executionId: source.sourceId };

			// The row names no workflow, so a temp placeholder has nothing to fall back on.
			return isExecutionIdV2(source.sourceId)
				? await this.resolveEngineV2Execution(source.sourceId)
				: null;
		}

		// filesystem / filesystem-v2 / s3 / azure embed the execution in the path
		const location = parseExecutionFileId(fileId);
		if (!location) return null;

		const { workflowId, executionId } = location;
		if (isExecutionIdV1(executionId)) return { executionId };

		// The placeholder names no execution yet, so the workflow in the path
		// authorizes the read.
		if (executionId === TEMP_EXECUTION_ID) return { workflowId };

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
	): Promise<{ workflowId: string } | null> {
		const execution = await this.dataPlane.getExecution(executionId);
		return execution ? { workflowId: execution.workflowId } : null;
	}
}
