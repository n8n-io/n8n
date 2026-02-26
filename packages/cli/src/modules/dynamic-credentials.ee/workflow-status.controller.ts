import { Get, Options, Post, RestController } from '@n8n/decorators';
import { WorkflowExecutionStatus } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';

import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { getDynamicCredentialMiddlewares } from './utils';

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
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['get', 'post', 'options']);
	}

	/**
	 * GET /workflows/:workflowId/execution-status
	 *
	 * Checks if a workflow is ready to execute by validating all resolvable credentials.
	 * Supports Bearer token, cookie, or Slack signature authentication via ?authSource query param.
	 *
	 * @returns Workflow execution status with credential details and authorization URLs
	 */
	@Get('/:workflowId/execution-status', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
	})
	async checkWorkflowForExecution(req: Request, res: Response): Promise<WorkflowExecutionStatus> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, [
			'get',
			'post',
			'options',
		]);
		return await this.buildExecutionStatus(req);
	}

	/**
	 * POST /workflows/:workflowId/execution-status
	 *
	 * Same as GET but accepts POST requests for Slack slash commands,
	 * which always send POST with application/x-www-form-urlencoded body.
	 */
	@Post('/:workflowId/execution-status', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
	})
	async checkWorkflowForExecutionPost(
		req: Request,
		res: Response,
	): Promise<WorkflowExecutionStatus> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, [
			'get',
			'post',
			'options',
		]);
		return await this.buildExecutionStatus(req);
	}

	private async buildExecutionStatus(req: Request): Promise<WorkflowExecutionStatus> {
		const workflowId = req.params['workflowId'];

		if (!workflowId) {
			throw new BadRequestError('Workflow ID is missing');
		}

		const credentialContext =
			await this.dynamicCredentialWebService.getCredentialContextFromRequest(req, workflowId);

		const status = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			credentialContext,
		);

		const isReady = status.every((s) => s.status === 'configured');

		const basePath = this.urlService.getInstanceBaseUrl();
		const restPath = this.globalConfig.endpoints.rest;

		return {
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
	}
}
