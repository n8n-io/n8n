import {
	CreateSecretsProviderConnectionDto,
	UpdateSecretsProviderConnectionDto,
	ReloadSecretProviderConnectionResponse,
	TestSecretProviderConnectionResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Middleware,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service.ee';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SecretsProvidersResponses } from '@/modules/external-secrets.ee/secrets-providers.responses.ee';
import { sendErrorResponse } from '@/response-helper';

@RestController('/secret-providers/connections')
export class SecretProvidersConnectionsController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
		private readonly connectionsService: SecretsProvidersConnectionsService,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	@Middleware()
	checkFeatureFlag(req: Request, res: Response, next: NextFunction) {
		// Project-scoped connections require externalSecretsForProjects
		const isProjectScopedRequest =
			(req.method === 'POST' || req.method === 'PATCH') &&
			(req.body.projectIds as string[])?.length > 0;
		if (isProjectScopedRequest) {
			if (!this.config.externalSecretsForProjects) {
				this.logger.warn(
					'Tried to create a project-scoped external secret connection without feature flag enabled',
				);
				sendErrorResponse(
					res,
					new ForbiddenError(
						'Tried to create a project-scoped external secret connection without feature flag enabled',
					),
				);
				return;
			}
			next();
			return;
		}

		// All other requests require at least one feature flag
		if (
			!this.config.externalSecretsForProjects &&
			!this.config.externalSecretsMultipleConnections
		) {
			this.logger.warn('Requested beta external secret endpoint without feature flag enabled');
			sendErrorResponse(
				res,
				new ForbiddenError('Requested beta external secret endpoint without feature flag enabled'),
			);
			return;
		}

		next();
	}

	@Post('/')
	@GlobalScope('externalSecretsProvider:create')
	async createConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateSecretsProviderConnectionDto,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Creating new connection', {
			providerKey: body.providerKey,
			type: body.type,
		});
		const savedConnection = await this.connectionsService.createConnection(body, req.user.id);
		return this.connectionsService.toPublicConnection(savedConnection);
	}

	@Patch('/:providerKey')
	@GlobalScope('externalSecretsProvider:update')
	async updateConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
		@Body body: UpdateSecretsProviderConnectionDto,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Updating connection', { providerKey });
		const connection = await this.connectionsService.updateConnection(
			providerKey,
			body,
			req.user.id,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Delete('/:providerKey')
	@GlobalScope('externalSecretsProvider:delete')
	async deleteConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Deleting connection', { providerKey });
		const connection = await this.connectionsService.deleteConnection(providerKey, req.user.id);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Get('/')
	@GlobalScope('externalSecretsProvider:read')
	async listConnections(): Promise<SecretsProvidersResponses.PublicConnectionList> {
		this.logger.debug('Listing all connections');
		const connections = await this.connectionsService.listConnections();
		return connections.map((connection) =>
			this.connectionsService.toPublicConnectionListItem(connection),
		);
	}

	@Get('/:providerKey')
	@GlobalScope('externalSecretsProvider:read')
	async getConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	): Promise<SecretsProvidersResponses.PublicConnection> {
		this.logger.debug('Getting connection', { providerKey });
		const connection = await this.connectionsService.getConnection(providerKey);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Post('/:providerKey/test')
	@GlobalScope('externalSecretsProvider:update')
	async testConnection(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	): Promise<TestSecretProviderConnectionResponse> {
		this.logger.debug('Testing provider connection', { providerKey });
		return await this.connectionsService.testConnection(providerKey, req.user.id);
	}

	@Post('/:providerKey/reload')
	@GlobalScope('externalSecretsProvider:sync')
	async reloadConnectionSecrets(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	): Promise<ReloadSecretProviderConnectionResponse> {
		this.logger.debug('Reloading secrets for secret provider connection', { providerKey });
		return await this.connectionsService.reloadConnectionSecrets(providerKey, req.user.id);
	}
}
