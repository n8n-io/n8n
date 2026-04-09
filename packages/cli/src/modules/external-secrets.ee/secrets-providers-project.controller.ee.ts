import {
	CreateSecretsProviderConnectionDto,
	UpdateSecretsProviderConnectionDto,
	type SecretProviderConnection,
	type SecretProviderConnectionListItem,
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

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { sendErrorResponse } from '@/response-helper';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProviderAccessCheckService } from './secret-provider-access-check.service.ee';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';

@RestController('/secret-providers/projects')
export class SecretProvidersProjectController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly connectionsService: SecretsProvidersConnectionsService,
		private readonly accessCheckService: SecretsProviderAccessCheckService,
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
	): Promise<SecretProviderConnection> {
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
			// When creating a connection for a project, the project owns the connection
			'secretsProviderConnection:owner',
		);

		const connection = this.connectionsService.toPublicConnection(savedConnection);
		const scopes = await this.accessCheckService.getConnectionScopesForProject(
			req.user,
			body.providerKey,
			projectId,
		);
		return { ...connection, scopes };
	}

	@Get('/:projectId/connections')
	@ProjectScope('externalSecretsProvider:list')
	async listConnectionsForAProject(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<SecretProviderConnectionListItem[]> {
		this.logger.debug('List all connections within a project', { projectId });
		const connections = await this.connectionsService.listConnectionsForProject(projectId);
		return connections.map((c) => this.connectionsService.toPublicConnectionListItem(c));
	}

	@Get('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:read')
	async getConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
	): Promise<SecretProviderConnection> {
		this.logger.debug('Getting connection for project', { projectId, providerKey });
		const connectionEntity = await this.connectionsService.getConnectionAccessibleFromProject(
			providerKey,
			projectId,
		);

		const connection = this.connectionsService.toPublicConnection(connectionEntity);
		const scopes = await this.accessCheckService.getConnectionScopesForProject(
			req.user,
			providerKey,
			projectId,
		);

		return { ...connection, scopes };
	}

	@Patch('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:update')
	async updateConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
		@Body body: UpdateSecretsProviderConnectionDto,
	): Promise<SecretProviderConnection> {
		this.logger.debug('Updating connection for project', { projectId, providerKey });

		await this.accessCheckService.assertConnectionAccess({
			providerKey,
			projectId,
			requiredScope: 'externalSecretsProvider:update',
			user: req.user,
		});

		const { projectIds: _, ...updates } = body;
		const updated = await this.connectionsService.updateProjectConnection(
			providerKey,
			updates,
			req.user.id,
		);

		const connection = this.connectionsService.toPublicConnection(updated);
		const scopes = await this.accessCheckService.getConnectionScopesForProject(
			req.user,
			providerKey,
			projectId,
		);
		return { ...connection, scopes };
	}

	@Delete('/:projectId/connections/:providerKey')
	@ProjectScope('externalSecretsProvider:delete')
	async deleteConnection(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('providerKey') providerKey: string,
	) {
		this.logger.debug('Deleting connection for project', { projectId, providerKey });

		await this.accessCheckService.assertConnectionAccess({
			providerKey,
			projectId,
			requiredScope: 'externalSecretsProvider:delete',
			user: req.user,
		});

		await this.connectionsService.deleteConnectionForProject(providerKey, projectId);
		res.status(204).send();
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

		await this.accessCheckService.assertConnectionAccess({
			providerKey,
			projectId,
			requiredScope: 'externalSecretsProvider:update',
			user: req.user,
		});

		return await this.connectionsService.testConnection(providerKey, req.user.id);
	}
}
