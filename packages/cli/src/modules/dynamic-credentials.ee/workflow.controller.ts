import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { WorkflowExecutionStatusDto } from '@n8n/api-types';

const BEARER_TOKEN_REGEX = /^[Bb][Ee][Aa][Rr][Ee][Rr]\s+(.+)$/;

@RestController('/workflows')
export class WorkflowStatusController {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
	) {}

	@Get('/:workflowId/execution-status', { skipAuth: true })
	async checkWorkflowForExecution(
		req: Request,
		_res: Response,
	): Promise<WorkflowExecutionStatusDto> {
		const workflowId = req.params['workflowId'];
		const headerValue = req.headers['authorization']?.toString();

		if (!headerValue) {
			throw new BadRequestError('Authorization header missing');
		}

		const result = BEARER_TOKEN_REGEX.exec(headerValue);
		const token = result ? result[1] : null;

		if (!token) {
			throw new BadRequestError('Authorization header is malformed');
		}

		if (!workflowId) {
			throw new BadRequestError('Workflow ID is missing');
		}

		const status = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			token,
		);

		const isReady = status.every((s) => s.status === 'configured');

		const executionStatus: WorkflowExecutionStatusDto = {
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
