import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { WorkflowExecutionStatus } from '@n8n/api-types';
import { getBearerToken } from './utils';

@RestController('/workflows')
export class WorkflowStatusController {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
	) {}

	/**
	 * GET /workflows/:workflowId/execution-status
	 *
	 * Checks if a workflow is ready to execute by validating all resolvable credentials.
	 * Requires Bearer token authentication in Authorization header.
	 *
	 * @returns Workflow execution status with credential details and authorization URLs
	 * @throws {BadRequestError} When authorization header is missing or malformed
	 */
	@Get('/:workflowId/execution-status', { skipAuth: true })
	async checkWorkflowForExecution(req: Request, _res: Response): Promise<WorkflowExecutionStatus> {
		const workflowId = req.params['workflowId'];
		const token = getBearerToken(req);

		if (!workflowId) {
			throw new BadRequestError('Workflow ID is missing');
		}

		const status = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			token,
		);

		const isReady = status.every((s) => s.status === 'configured');

		const executionStatus: WorkflowExecutionStatus = {
			workflowId,
			readyToExecute: isReady,
			credentials: status.map((s) => ({
				credentialId: s.credentialId,
				credentialStatus: s.status,
				credentialType: s.credentialType,
				authorizationUrl: `/credentials/${s.credentialId}/authorize?resolverId=${encodeURIComponent(s.resolverId)}`,
			})),
		};
		return executionStatus;
	}
}
