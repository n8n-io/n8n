import {
	CreateApiKeyRequestDto,
	ListApiKeysQueryDto,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
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

	@GlobalScope('apiKey:create')
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

	// `apiKey:manage` callers see every key by default; `ownership=mine` narrows to own.
	@GlobalScope('apiKey:list')
	@Get('/', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeys(req: AuthenticatedRequest, _res: Response, @Query query: ListApiKeysQueryDto) {
		return await this.publicApiKeyService.getRedactedApiKeys(req.user, {
			take: query.take,
			skip: query.skip,
			ownership: query.ownership,
			label: query.label,
			ownerIds: query.ownerIds,
			sortBy: query.sortBy,
		});
	}

	// Members can delete their own keys; `apiKey:manage` holders can revoke anyone's.
	@GlobalScope('apiKey:delete')
	@Delete('/:id', { middlewares: [isApiEnabledMiddleware] })
	async deleteApiKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		const { isOwn } = await this.publicApiKeyService.deleteApiKey(req.user, apiKeyId);

		this.eventService.emit('public-api-key-deleted', {
			user: req.user,
			publicApi: false,
			isOwn,
		});

		return { success: true };
	}

	// Owner-only — `apiKey:manage` doesn't extend to editing someone else's key.
	@GlobalScope('apiKey:update')
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

	// Owner-only — re-issues the secret in place, keeping label, scopes and expiry.
	@GlobalScope('apiKey:update')
	@Post('/:id/rotate', { middlewares: [isApiEnabledMiddleware] })
	async rotateApiKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		const rotatedApiKey = await this.publicApiKeyService.rotateApiKey(req.user, apiKeyId);

		this.eventService.emit('public-api-key-rotated', { user: req.user, publicApi: false });

		return {
			...rotatedApiKey,
			apiKey: this.publicApiKeyService.redactApiKey(rotatedApiKey.apiKey),
			rawApiKey: rotatedApiKey.apiKey,
			expiresAt: this.publicApiKeyService.getApiKeyExpiration(rotatedApiKey.apiKey),
		};
	}

	@GlobalScope('apiKey:list')
	@Get('/scopes', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeyScopes(req: AuthenticatedRequest, _res: Response) {
		const scopes = getApiKeyScopesForRole(req.user);
		return scopes;
	}
}
