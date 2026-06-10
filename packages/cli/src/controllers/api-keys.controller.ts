import {
	CreateApiKeyRequestDto,
	ListApiKeysQueryDto,
	UpdateApiKeyRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
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
import { UrlService } from '@/services/url.service';
import { UserManagementMailer } from '@/user-management/email';

export const isApiEnabledMiddleware: RequestHandler = (_, res, next) => {
	if (isApiEnabled()) {
		next();
	} else {
		res.status(404).end();
	}
};

const REVOKED_AT_FORMATTER = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

function formatRevokedAt(date: Date): string {
	return REVOKED_AT_FORMATTER.format(date);
}

function formatRevokedBy(user: {
	firstName?: string | null;
	lastName?: string | null;
	email: string;
}): string {
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
	return fullName || user.email;
}

@RestController('/api-keys')
export class ApiKeysController {
	constructor(
		private readonly eventService: EventService,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
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
			sortBy: query.sortBy,
		});
	}

	// Members can delete their own keys; `apiKey:manage` holders can revoke anyone's.
	@GlobalScope('apiKey:delete')
	@Delete('/:id', { middlewares: [isApiEnabledMiddleware] })
	async deleteApiKey(req: AuthenticatedRequest, _res: Response, @Param('id') apiKeyId: string) {
		const { isOwn, apiKey } = await this.publicApiKeyService.deleteApiKey(req.user, apiKeyId);

		this.eventService.emit('public-api-key-deleted', {
			user: req.user,
			publicApi: false,
			isOwn,
		});

		if (!isOwn) {
			try {
				await this.mailer.apiKeyRevoked({
					email: apiKey.user.email,
					firstName: apiKey.user.firstName ?? 'there',
					label: apiKey.label,
					suffix: apiKey.apiKey.slice(-4),
					revokedBy: formatRevokedBy(req.user),
					revokedAt: formatRevokedAt(new Date()),
					createApiKeyUrl: `${this.urlService.getInstanceBaseUrl()}/settings/api`,
				});
			} catch (e) {
				this.logger.error('Failed to send API key revocation email', {
					apiKeyId: apiKey.id,
					ownerId: apiKey.userId,
					error: e instanceof Error ? e.message : String(e),
				});
			}
		}

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

	@GlobalScope('apiKey:list')
	@Get('/scopes', { middlewares: [isApiEnabledMiddleware] })
	async getApiKeyScopes(req: AuthenticatedRequest, _res: Response) {
		const scopes = getApiKeyScopesForRole(req.user);
		return scopes;
	}
}
