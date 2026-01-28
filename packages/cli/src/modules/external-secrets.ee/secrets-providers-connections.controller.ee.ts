import {
	CreateSecretsProviderConnectionDto,
	UpdateSecretsProviderConnectionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Middleware,
	Param,
	Patch,
	Post,
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

	@Post('/')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:create')
	async createConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateSecretsProviderConnectionDto,
	) {
		this.logger.debug('Creating new connection', {
			providerKey: body.providerKey,
			type: body.type,
		});
		const connection = await this.connectionsService.createConnection(
			body.providerKey,
			body.type,
			body.projectIds,
			body.settings,
		);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Patch('/:providerKey')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:update')
	async updateConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
		@Body body: UpdateSecretsProviderConnectionDto,
	) {
		this.logger.debug('Updating connection', { providerKey });
		const connection = await this.connectionsService.updateConnection(providerKey, body);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Delete('/:providerKey')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:delete')
	async deleteConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		this.logger.debug('Deleting connection', { providerKey });
		const connection = await this.connectionsService.deleteConnection(providerKey);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Get('/')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:read')
	async listConnections() {
		this.logger.debug('Listing all connections');
		const connections = await this.connectionsService.listConnections();
		return connections.map((connection) => this.connectionsService.toPublicConnection(connection));
	}

	@Get('/:providerKey')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:read')
	async getConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') providerKey: string,
	) {
		this.logger.debug('Getting connection', { providerKey });
		const connection = await this.connectionsService.getConnection(providerKey);
		return this.connectionsService.toPublicConnection(connection);
	}

	@Post('/:providerKey/test')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:read')
	testConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') _providerKey: string,
	) {
		this.logger.debug('Testing provider connnection');
		//TODO implement
		return;
	}

	@Post('/:providerKey/connect')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:update')
	toggleConnectionStatus(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') _providerKey: string,
	) {
		this.logger.debug('Toggling connection status');
		//TODO implement
		return;
	}

	@Post('/:providerKey/reload')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:sync')
	reloadConnectionSecrets(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') _providerKey: string,
	) {
		this.logger.debug('Reloading secrets for secret provider connection');
		return;
	}

	@Post('/:providerKey/share')
	@Licensed('feat:externalSecrets')
	@GlobalScope('externalSecretsProvider:update')
	shareConnection(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('providerKey') _providerKey: string,
	) {
		this.logger.debug('Share connection with other projects');
		return;
	}
}
