import { type RequestHandler } from 'express';

import { Delete, Get, Post, RestController } from '@/decorators';
import { EventService } from '@/events/event.service';
import { isApiEnabled } from '@/public-api';
import { ApiKeysRequest, AuthenticatedRequest } from '@/requests';
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
	) {}

	/**
	 * Create an API Key
	 */
	@Post('/', { middlewares: [isApiEnabledMiddleware] })
	async createAPIKey(req: AuthenticatedRequest) {
		const newApiKey = await this.publicApiKeyService.createPublicApiKeyForUser(req.user);

		this.eventService.emit('public-api-key-created', { user: req.user, publicApi: false });

		return newApiKey;
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
	async deleteAPIKey(req: ApiKeysRequest.DeleteAPIKey) {
		await this.publicApiKeyService.deleteApiKeyForUser(req.user, req.params.id);

		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });

		return { success: true };
	}
}
