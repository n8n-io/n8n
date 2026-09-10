import type { User } from '@n8n/db';
import { BinaryDataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { getExecutionIdFromFileId } from 'n8n-core';

import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

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
		const executionId = await this.resolveExecutionId(binaryDataId);
		if (!executionId) return false;

		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		return await this.executionRepository.existsForAccessibleWorkflows(
			executionId,
			accessibleWorkflowIds,
		);
	}

	/**
	 * Resolve the execution a binary belongs to, or null for binaries not tied to
	 * an execution (custom sources) or IDs that cannot be mapped to one.
	 */
	private async resolveExecutionId(binaryDataId: string): Promise<string | null> {
		const separatorIndex = binaryDataId.indexOf(':');
		if (separatorIndex === -1) return null;

		const mode = binaryDataId.substring(0, separatorIndex);
		const fileId = binaryDataId.substring(separatorIndex + 1);

		// database mode stores a bare uuid; the row carries the source
		if (mode === 'database') {
			const source = await this.binaryDataRepository.findSourceByFileId(fileId);
			return source?.sourceType === 'execution' ? source.sourceId : null;
		}

		// filesystem / filesystem-v2 / s3 / azure embed the execution in the path
		return getExecutionIdFromFileId(fileId);
	}
}
