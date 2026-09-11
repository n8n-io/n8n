import type { User } from '@n8n/db';
import { BinaryDataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { parseExecutionFileId, TEMP_EXECUTION_ID } from 'n8n-core';

import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

/**
 * Workflow that a binary derives its access from. Normally the workflow of the
 * execution that owns the binary. A binary written before its execution row
 * exists names its workflow in the file path instead.
 */
type AccessSource = { executionId: string } | { workflowId: string };

/**
 * Authorizes access to binary data. A binary belongs to an execution, so access
 * derives from `workflow:read` on that execution's workflow.
 */
@Service()
export class BinaryDataAccessService {
	constructor(
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataRepository: BinaryDataRepository,
	) {}

	/** Whether `user` may read the execution that owns `binaryDataId`. */
	async hasReadAccess(user: User, binaryDataId: string): Promise<boolean> {
		const source = await this.resolveAccessSource(binaryDataId);
		if (!source) return false;

		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
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

			// The row names no workflow, so a temp placeholder has nothing to fall back on.
			return source.sourceId === TEMP_EXECUTION_ID ? null : { executionId: source.sourceId };
		}

		// filesystem / filesystem-v2 / s3 / azure embed the execution in the path
		const location = parseExecutionFileId(fileId);
		if (!location) return null;

		// The execution id column is numeric, so the placeholder must not reach the
		// query. Authorize on the workflow the path carries instead.
		return location.executionId === TEMP_EXECUTION_ID
			? { workflowId: location.workflowId }
			: { executionId: location.executionId };
	}
}
