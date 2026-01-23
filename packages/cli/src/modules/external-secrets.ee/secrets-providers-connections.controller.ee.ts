import { Logger } from '@n8n/backend-common';
import {
	Delete,
	Put,
	Post,
	Get,
	Patch,
	RestController,
	GlobalScope,
	Middleware,
} from '@n8n/decorators';
import { Request, Response, NextFunction } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ExternalSecretsConfig } from './external-secrets.config';

@RestController('/secret-providers/connections')
export class SecretProvidersConnectionsController {
	constructor(
		private readonly config: ExternalSecretsConfig,
		private readonly logger: Logger,
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
	async createConnection() {
		this.logger.debug('Create a new connection');
		//TODO implement
		return await Promise.resolve();
	}

	@Patch('/:providerKey')
	@GlobalScope('externalSecretsProvider:update')
	async updateConnectionValues() {
		this.logger.debug('Update specific fields only (update projectIds, or connection settings)');
		//TODO implement
		return await Promise.resolve();
	}

	@Delete('/:providerKey')
	@GlobalScope('externalSecretsProvider:delete')
	async deleteConnection() {
		this.logger.debug('Delete a connection');
		//TODO implement
		return await Promise.resolve();
	}

	@Get('/')
	@GlobalScope('externalSecretsProvider:read')
	async listConnections() {
		this.logger.debug('list all secret provider connections');
		//TODO implement
		return await Promise.resolve();
	}

	@Get('/:providerKey')
	@GlobalScope('externalSecretsProvider:read')
	async getConnection() {
		this.logger.debug('Read specific provider connection properties');
		//TODO implement
		return await Promise.resolve();
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
