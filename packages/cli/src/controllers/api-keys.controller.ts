import { CreateApiKeyRequestDto, UpdateApiKeyRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@n8n/decorators';
import { getApiKeyScopesForRole } from '@n8n/permissions';
import type { RequestHandler } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { isApiEnabled } from '@/public-api';
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
	async createApiKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateApiKeyRequestDto,
	) {
		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user, body.scopes)) {
			throw new BadRequestError('Invalid scopes for user role');
		}

		const newApiKey = await this.publicApiKeyService.createPublicApiKeyForUser(req.user, body);

		this.eventService.emit('public-api-key-created', { user: req.user, publicApi: false });

		return {
			...newApiKey,
			apiKey: this.publicApiKeyService.redactApiKey(newApiKey.apiKey),
			rawApiKey: newApiKey.apiKey,
			expiresAt: body.expiresAt,
		};
	}

	/**
	 * Get API keys
	 */
	@Get('/', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeys(req: AuthenticatedRequest) {
		const apiKeys = await this.publicApiKeyService.getRedactedApiKeysForUser(req.user);
		return apiKeys;
	}

	/**
	 * Delete an API Key
	 */
	@Delete('/:id', { middlewares: [isApiEnabledMiddleware] })
	async deleteApiKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		await this.publicApiKeyService.deleteApiKeyForUser(req.user, apiKeyId);

		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });

		return { success: true };
	}

	/**
	 * Patch an API Key
	 */
	@Patch('/:id', { middlewares: [isApiEnabledMiddleware] })
	async updateApiKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') apiKeyId: string,
		@Body body: UpdateApiKeyRequestDto,
	) {
		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user, body.scopes)) {
			throw new BadRequestError('Invalid scopes for user role');
		}

		await this.publicApiKeyService.updateApiKeyForUser(req.user, apiKeyId, body);

		return { success: true };
	}

	@Get('/scopes', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeyScopes(req: AuthenticatedRequest, _res: Response) {
		const scopes = getApiKeyScopesForRole(req.user);
		return scopes;
	}
}
