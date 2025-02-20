import { CreateApiKeyRequestDto, UpdateApiKeyRequestDto } from '@n8n/api-types';
import type { RequestHandler } from 'express';

import { ApiKeyRepository } from '@/databases/repositories/api-key.repository';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { isApiEnabled } from '@/public-api';
import { AuthenticatedRequest } from '@/requests';
import { PublicApiKeyService } from '@/services/public-api-key.service';

export const isApiEnabledMiddleware: RequestHandler = (_, res, next) => {
	if (isApiEnabled()) {
		next();
	} else {
		res.status(404).end();
	}
};

@RestController('/api-keys')
export class ApiKeysController {
	constructor(
		private readonly eventService: EventService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly apiKeysRepository: ApiKeyRepository,
		private readonly license: License,
	) {}

	/**
	 * Create an API Key
	 */
	@Post('/', { middlewares: [isApiEnabledMiddleware] })
	async createAPIKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Body { label, expiresAt }: CreateApiKeyRequestDto,
	) {
		const currentNumberOfApiKeys = await this.apiKeysRepository.countBy({ userId: req.user.id });

		if (currentNumberOfApiKeys >= this.license.getApiKeysPerUserLimit()) {
			throw new BadRequestError('You have reached the maximum number of API keys allowed.');
		}

		const newApiKey = await this.publicApiKeyService.createPublicApiKeyForUser(req.user, {
			label,
			expiresAt,
		});

		this.eventService.emit('public-api-key-created', { user: req.user, publicApi: false });

		return {
			...newApiKey,
			apiKey: this.publicApiKeyService.redactApiKey(newApiKey.apiKey),
			rawApiKey: newApiKey.apiKey,
			expiresAt,
		};
	}

	/**
	 * Get API keys
	 */
	@Get('/', { middlewares: [isApiEnabledMiddleware] })
	async getAPIKeys(req: AuthenticatedRequest) {
		const apiKeys = await this.publicApiKeyService.getRedactedApiKeysForUser(req.user);
		return apiKeys;
	}

	/**
	 * Delete an API Key
	 */
	@Delete('/:id', { middlewares: [isApiEnabledMiddleware] })
	async deleteAPIKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		await this.publicApiKeyService.deleteApiKeyForUser(req.user, apiKeyId);

		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });

		return { success: true };
	}

	/**
	 * Patch an API Key
	 */
	@Patch('/:id', { middlewares: [isApiEnabledMiddleware] })
	async updateAPIKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') apiKeyId: string,
		@Body { label }: UpdateApiKeyRequestDto,
	) {
		await this.publicApiKeyService.updateApiKeyForUser(req.user, apiKeyId, {
			label,
		});

		return { success: true };
	}
}
