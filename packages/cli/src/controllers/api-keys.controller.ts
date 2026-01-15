import { CreateApiKeyRequestDto, UpdateApiKeyRequestDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import { getApiKeyScopesForRole } from '@n8n/permissions';
import type { RequestHandler } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
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
		private readonly license: License,
	) {}

	/**
	 * Create an API Key
	 */
	@GlobalScope('apiKey:manage')
	@Post('/', { middlewares: [isApiEnabledMiddleware] })
	async createApiKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateApiKeyRequestDto,
	) {
		// If the API Key Scopes feature is not licensed, ignore custom scopes
		// and assign all available scopes for the user's role
		const scopes = this.license.isLicensed(LICENSE_FEATURES.API_KEY_SCOPES)
			? body.scopes
			: getApiKeyScopesForRole(req.user);

		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user, scopes)) {
			throw new BadRequestError('Invalid scopes for user role');
		}

		const newApiKey = await this.publicApiKeyService.createPublicApiKeyForUser(req.user, {
			...body,
			scopes,
		});

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
	@GlobalScope('apiKey:manage')
	@Get('/', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeys(req: AuthenticatedRequest) {
		const apiKeys = await this.publicApiKeyService.getRedactedApiKeysForUser(req.user);
		return apiKeys;
	}

	/**
	 * Delete an API Key
	 */
	@GlobalScope('apiKey:manage')
	@Delete('/:id', { middlewares: [isApiEnabledMiddleware] })
	async deleteApiKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		await this.publicApiKeyService.deleteApiKeyForUser(req.user, apiKeyId);

		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });

		return { success: true };
	}

	/**
	 * Patch an API Key
	 */
	@GlobalScope('apiKey:manage')
	@Patch('/:id', { middlewares: [isApiEnabledMiddleware] })
	async updateApiKey(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') apiKeyId: string,
		@Body body: UpdateApiKeyRequestDto,
	) {
		// If the API Key Scopes feature is not licensed, ignore custom scopes
		// and assign all available scopes for the user's role
		const scopes = this.license.isLicensed(LICENSE_FEATURES.API_KEY_SCOPES)
			? body.scopes
			: getApiKeyScopesForRole(req.user);

		if (!this.publicApiKeyService.apiKeyHasValidScopesForRole(req.user, scopes)) {
			throw new BadRequestError('Invalid scopes for user role');
		}

		await this.publicApiKeyService.updateApiKeyForUser(req.user, apiKeyId, {
			...body,
			scopes,
		});

		return { success: true };
	}

	@GlobalScope('apiKey:manage')
	@Get('/scopes', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeyScopes(req: AuthenticatedRequest, _res: Response) {
		const scopes = getApiKeyScopesForRole(req.user);
		return scopes;
	}
}
