import {
	CreateSecretsProviderConnectionDto,
	UpdateSecretsProviderConnectionDto,
	type ReloadSecretProviderConnectionResponse,
	type TestSecretProviderConnectionResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';
import type { SecretsProvidersResponses } from './secrets-providers.responses.ee';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

@RestController('/secret-providers/projects')
export class SecretProvidersProjectController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly connectionsService: SecretsProvidersConnectionsService,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	@Middleware()
	checkFeatureFlag(_req: Request, res: Response, next: NextFunction) {
		if (!this.config.externalSecretsForProjects) {
			this.logger.warn('External secrets for projects feature is not enabled');
			sendErrorResponse(
				res,
				new ForbiddenError('External secrets for projects feature is not enabled'),
			);
			return;
		}
		next();
	}

	@Post('/:projectId/connections')
	@ProjectScope('externalSecretsProvider:create')
	async createConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body body: CreateSecretsProviderConnectionDto,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Creating connection for project', {
			projectId,
			providerKey: body.providerKey,
		});
		const savedConnection = await this.connectionsService.createConnection(
			{
				...body,
				projectIds: [projectId],
			},
			req.user.id,
		);
		return this.connectionsService.toPublicConnection(savedConnection);
	}

	@Get('/:projectId/connections')
	@ProjectScope('externalSecretsProvider:list')
	async listConnectionsForAProject(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<SecretsProvidersResponses.ConnectionListItem[]> {
		this.logger.debug('List all connections within a project', { projectId });
		const connections = await this.connectionsService.listConnectionsForProject(projectId);
		return connections.map((c) => this.connectionsService.toPublicConnectionListItem(c));
	}

	@Get('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:read')
	async getConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Getting connection for project', { projectId, providerKey });
		const connection = await this.connectionsService.getConnectionForProject(
			providerKey,
			projectId,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Patch('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:update')
	async updateConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
		@Body body: UpdateSecretsProviderConnectionDto,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Updating connection for project', { projectId, providerKey });
		await this.connectionsService.getConnectionForProject(providerKey, projectId);
		const { projectIds: _, ...updates } = body;
		const connection = await this.connectionsService.updateConnection(
			providerKey,
			updates,
			req.user.id,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Delete('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:delete')
	async deleteConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Deleting connection for project', { projectId, providerKey });
		const connection = await this.connectionsService.deleteConnectionForProject(
			providerKey,
			projectId,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Post('/:projectId/connections/:providerKey/test')
	@ProjectScope('externalSecretsProvider:update')
	async testConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
	): Promise<TestSecretProviderConnectionResponse> {
		this.logger.debug('Testing connection for project', { projectId, providerKey });
		await this.connectionsService.getConnectionForProject(providerKey, projectId);
		return await this.connectionsService.testConnection(providerKey, req.user.id);
	}

	@Post('/:projectId/reload')
	@ProjectScope('externalSecretsProvider:sync')
	async reloadConnectionSecrets(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ReloadSecretProviderConnectionResponse> {
		this.logger.debug('Reloading all secrets for project', { projectId });
		return await this.connectionsService.reloadProjectConnectionSecrets(projectId, req.user.id);
	}
}
