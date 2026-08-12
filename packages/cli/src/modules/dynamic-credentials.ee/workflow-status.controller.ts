import { WorkflowExecutionStatus } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { isAuthenticatedRequest } from '@n8n/db';
import { Get, Options, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { DynamicCredentialsConfig } from './dynamic-credentials.config';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';
import { getDynamicCredentialMiddlewares } from './utils';

const dynamicCredentialsConfig = Container.get(DynamicCredentialsConfig);

@RestController('/workflows')
export class WorkflowStatusController {
	constructor(
		private readonly credentialResolverWorkflowService: CredentialResolverWorkflowService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly dynamicCredentialCorsService: DynamicCredentialCorsService,
		private readonly dynamicCredentialWebService: DynamicCredentialWebService,
		private readonly workflowFinderService: WorkflowFinderService,
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
		ipRateLimit: {
			limit: dynamicCredentialsConfig.rateLimitPerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async checkWorkflowForExecution(req: Request, res: Response): Promise<WorkflowExecutionStatus> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['get', 'options']);
		const workflowId = req.params['workflowId'];
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);

		if (!workflowId) {
			throw new BadRequestError('Workflow ID is missing');
		}

		// In-app callers carry a user and must have access; token-auth resolver callers don't
		const user = isAuthenticatedRequest(req) ? req.user : undefined;
		if (user) {
			const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:read',
			]);
			if (!workflow) {
				throw new NotFoundError('Workflow not found');
			}
		}

		const status = await this.credentialResolverWorkflowService.getWorkflowStatus(
			workflowId,
			credentialContext,
			user,
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
				...(s.resolverId
					? {
							authorizationUrl: `${basePath}/${restPath}/credentials/${s.credentialId}/authorize?resolverId=${encodeURIComponent(s.resolverId)}`,
							revokeUrl: `${basePath}/${restPath}/credentials/${s.credentialId}/revoke?resolverId=${encodeURIComponent(s.resolverId)}`,
						}
					: {}),
			})),
		};
		return executionStatus;
	}
}
