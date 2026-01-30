import { Get, Options, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { WorkflowExecutionStatus } from '@n8n/api-types';
import { getDynamicCredentialMiddlewares } from './utils';
import { UrlService } from '@/services/url.service';
import { GlobalConfig } from '@n8n/config';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';

@RestController('/workflows')
export class WorkflowStatusController {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly dynamicCredentialCorsService: DynamicCredentialCorsService,
		private readonly dynamicCredentialWebService: DynamicCredentialWebService,
	) {}

	/**
	 * OPTIONS /workflows/:workflowId/execution-status
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:workflowId/execution-status', { skipAuth: true })
	handlePreflightExecutionStatus(req: Request, res: Response): void {
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['get', 'options']);
	}

	/**
	 * GET /workflows/:workflowId/execution-status
	 *
	 * Checks if a workflow is ready to execute by validating all resolvable credentials.
	 * Requires Bearer token authentication in Authorization header.
	 *
	 * @returns Workflow execution status with credential details and authorization URLs
	 * @throws {BadRequestError} When authorization header is missing or malformed
	 */
	@Get('/:workflowId/execution-status', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
	})
	async checkWorkflowForExecution(req: Request, res: Response): Promise<WorkflowExecutionStatus> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['get', 'options']);
		const workflowId = req.params['workflowId'];
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);

		if (!workflowId) {
			throw new BadRequestError('Workflow ID is missing');
		}

		const status = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			credentialContext,
		);

		const isReady = status.every((s) => s.status === 'configured');

		const basePath = this.urlService.getInstanceBaseUrl();
		const restPath = this.globalConfig.endpoints.rest;

		const executionStatus: WorkflowExecutionStatus = {
			workflowId,
			readyToExecute: isReady,
			credentials: status.map((s) => ({
				credentialId: s.credentialId,
				credentialName: s.credentialName,
				credentialStatus: s.status,
				credentialType: s.credentialType,
				authorizationUrl: `${basePath}/${restPath}/credentials/${s.credentialId}/authorize?resolverId=${encodeURIComponent(s.resolverId)}`,
				revokeUrl: `${basePath}/${restPath}/credentials/${s.credentialId}/revoke?resolverId=${encodeURIComponent(s.resolverId)}`,
			})),
		};
		return executionStatus;
	}
}
