import {
	CreateSecretsProviderConnectionDto,
	UpdateSecretsProviderConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Middleware,
	Param,
	Patch,
	Post,
	Put,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';
import { SecretsProvidersConnectionsService } from './secrets-providers-connections.service';

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
	checkFeatureFlag(_req: Request, _res: Response, next: NextFunction) {
		if (!this.config.externalSecretsForProjects) {
			throw new BadRequestError('External secrets for projects feature is not enabled');
		}
		next();
	}

	@Put('/:providerKey')
	@GlobalScope('externalSecretsProvider:create')
	async createConnection(
		@Param('providerKey') providerKey: string,
		@Body body: CreateSecretsProviderConnectionDto,
	) {
		this.logger.debug('Creating new connection', { providerKey, type: body.type });
		const connection = await this.connectionsService.createConnection(
			providerKey,
			body.type,
			body.projectIds,
			body.settings,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Patch('/:providerKey')
	@GlobalScope('externalSecretsProvider:update')
	async updateConnection(
		@Param('providerKey') providerKey: string,
		@Body body: UpdateSecretsProviderConnectionDto,
	) {
		this.logger.debug('Updating connection', { providerKey });
		const connection = await this.connectionsService.updateConnection(providerKey, body);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Delete('/:providerKey')
	@GlobalScope('externalSecretsProvider:delete')
	async deleteConnection(@Param('providerKey') providerKey: string) {
		this.logger.debug('Deleting connection', { providerKey });
		const connection = await this.connectionsService.deleteConnection(providerKey);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Get('/')
	@GlobalScope('externalSecretsProvider:read')
	async listConnections() {
		this.logger.debug('Listing all connections');
		const connections = await this.connectionsService.listConnections();
		return connections.map((connection) => this.connectionsService.toPublicConnection(connection));
	}

	@Get('/:providerKey')
	@GlobalScope('externalSecretsProvider:read')
	async getConnection(@Param('providerKey') providerKey: string) {
		this.logger.debug('Getting connection', { providerKey });
		const connection = await this.connectionsService.getConnection(providerKey);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Post('/:providerKey/test')
	@GlobalScope('externalSecretsProvider:read')
	testConnection() {
		this.logger.debug('Testing provider connnection');
		//TODO implement
		return;
	}

	@Post('/:providerKey/connect')
	@GlobalScope('externalSecretsProvider:update')
	toggleConnectionStatus() {
		this.logger.debug('Toggling connection status');
		//TODO implement
		return;
	}

	@Post('/:providerKey/reload')
	@GlobalScope('externalSecretsProvider:sync')
	reloadConnectionSecrets() {
		this.logger.debug('Reloading secrets for secret provider connection');
		return;
	}

	@Post('/:providerKey/share')
	@GlobalScope('externalSecretsProvider:update')
	shareConnection() {
		this.logger.debug('Share connection with other projects');
		return;
	}
}
