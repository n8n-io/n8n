import { Time } from '@n8n/constants';
import { CredentialsEntity, AuthenticatedRequest, isAuthenticatedRequest, User } from '@n8n/db';
import { Delete, Get, Options, Param, Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Request, Response } from 'express';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { CreateCsrfStateData, OauthService } from '@/oauth/oauth.service';
import { UrlService } from '@/services/url.service';

import { DynamicCredentialResolverRepository } from './database/repositories/credential-resolver.repository';
import { DynamicCredentialsConfig } from './dynamic-credentials.config';
import {
	AuthorizeIntentService,
	CredentialConnectionStatusService,
	DynamicCredentialResolverRegistry,
	DynamicCredentialService,
} from './services';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';
import { getDynamicCredentialMiddlewares } from './utils';

const dynamicCredentialsConfig = Container.get(DynamicCredentialsConfig);

@RestController('/credentials')
export class DynamicCredentialsController {
	constructor(
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly oauthService: OauthService,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly cipher: Cipher,
		private readonly dynamicCredentialCorsService: DynamicCredentialCorsService,
		private readonly dynamicCredentialWebService: DynamicCredentialWebService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialConnectionStatusService: CredentialConnectionStatusService,
		private readonly eventService: EventService,
		private readonly authorizeIntentService: AuthorizeIntentService,
		private readonly dynamicCredentialService: DynamicCredentialService,
		private readonly urlService: UrlService,
	) {}

	private async findCredentialToUse(
		credentialId: string,
		user?: User,
		scope?: Scope,
	): Promise<CredentialsEntity> {
		// External (static-token) callers have no n8n user; their identity is
		// validated by the resolver, so we resolve the credential by id. When the
		// request carries an n8n session user, enforce that user's access instead.
		const credential =
			user && scope
				? await this.credentialsFinderService.findCredentialForUser(credentialId, user, [scope])
				: await this.enterpriseCredentialsService.getOne(credentialId);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		if (
			!credential.type.toLowerCase().includes('oauth2') &&
			!credential.type.toLowerCase().includes('oauth1')
		) {
			throw new BadRequestError('Credential type not supported');
		}
		return credential;
	}

	private async getResolverInstance(resolverId: string | undefined) {
		if (!resolverId) {
			throw new BadRequestError('Missing resolverId query parameter');
		}

		const resolverEntity = await this.resolverRepository.findOneBy({
			id: resolverId,
		});

		if (!resolverEntity) {
			throw new NotFoundError('Resolver not found');
		}

		// Get resolver instance from registry
		const resolver = this.resolverRegistry.getResolverByTypename(resolverEntity.type);

		if (!resolver) {
			throw new NotFoundError('Resolver type not found');
		}
		return { resolver, resolverEntity };
	}

	/**
	 * OPTIONS /credentials/:id/revoke
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:id/revoke', { skipAuth: true })
	handlePreflightCredentialRevoke(req: Request, res: Response): void {
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['delete', 'options']);
	}

	@Delete('/:id/revoke', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
		ipRateLimit: {
			limit: dynamicCredentialsConfig.rateLimitPerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async revokeCredential(req: Request, res: Response): Promise<void> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['delete', 'options']);
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);
		const user = isAuthenticatedRequest(req) ? req.user : undefined;
		const credential = await this.findCredentialToUse(req.params.id, user, 'credential:update');

		const resolverId = req.query.resolverId as string | undefined;
		const { resolver, resolverEntity } = await this.getResolverInstance(resolverId);

		if (resolver.deleteSecret) {
			// Decrypt and parse resolver configuration
			const decryptedConfig = await this.cipher.decryptV2(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			await resolver.deleteSecret(credential.id, credentialContext, {
				configuration: resolverConfig,
				resolverId: resolverEntity.id,
				resolverName: resolverEntity.type,
			});
		}

		res.status(204).send(); // 204 No Content indicates successful deletion
	}

	/**
	 * OPTIONS /credentials/:id/authorize
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:id/authorize', { skipAuth: true })
	handlePreflightCredentialAuthorize(req: Request, res: Response): void {
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['post', 'options']);
	}

	@Post('/:id/authorize', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
		ipRateLimit: {
			limit: dynamicCredentialsConfig.rateLimitAuthorizePerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async authorizeCredential(req: Request, res: Response): Promise<string> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['post', 'options']);
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);
		const user = isAuthenticatedRequest(req) ? req.user : undefined;
		const credential = await this.findCredentialToUse(req.params.id, user, 'credential:update');

		const resolverId = req.query.resolverId as string | undefined;
		const { resolver, resolverEntity } = await this.getResolverInstance(resolverId);

		if (resolver.validateIdentity) {
			// Decrypt and parse resolver configuration
			const decryptedConfig = await this.cipher.decryptV2(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			await resolver.validateIdentity(credentialContext, {
				resolverId: resolverEntity.id,
				resolverName: resolverEntity.type,
				configuration: resolverConfig,
			});
		}

		// Best-effort: bind the callback to the intended n8n user when the resolver
		// names one, so `decodeCsrfState` rejects a mismatched session. External
		// machine callers legitimately have no n8n user, so this never fails the POST.
		const ownership = await this.dynamicCredentialService.resolveOwningUserIdForAuthorization(
			credentialContext,
			resolverEntity.id,
		);

		const csrfData: CreateCsrfStateData = {
			cid: credential.id,
			origin: 'dynamic-credential',
			authorizationHeader: req.headers.authorization ?? `Bearer ${credentialContext.identity}`,
			authMetadata: credentialContext.metadata,
			credentialResolverId: req.query.resolverId,
			userId: ownership.status === 'bound' ? ownership.userId : undefined,
		};

		if (credential.type.toLowerCase().includes('oauth2')) {
			return await this.oauthService.generateAOauth2AuthUri(credential, csrfData, req, res);
		}

		if (credential.type.toLowerCase().includes('oauth1')) {
			return await this.oauthService.generateAOauth1AuthUri(credential, csrfData, req, res);
		}

		throw new BadRequestError('Credential type not supported');
	}

	/**
	 * GET /credentials/:id/authorize?token=...
	 *
	 * Browser-clickable counterpart to the POST authorize flow. A credential gate hands
	 * back this short link instead of a large provider authorization URL; opening it
	 * materializes the OAuth flow (deferred discovery / client registration happens here)
	 * and redirects to the provider. The unguessable, short-lived `token` is the
	 * authorization — like the OAuth callback, no session or endpoint auth token is
	 * required, since the caller identity was captured server-side when the link was
	 * issued.
	 */
	@Get('/:id/authorize', {
		allowUnauthenticated: true,
		usesTemplates: true,
		ipRateLimit: {
			limit: dynamicCredentialsConfig.rateLimitAuthorizePerMinute,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async authorizeCredentialRedirect(req: Request, res: Response): Promise<void> {
		const token = typeof req.query.token === 'string' ? req.query.token : undefined;
		if (!token) {
			this.oauthService.renderCallbackError(res, 'Missing authorization token.');
			return;
		}

		const intent = await this.authorizeIntentService.get(token);
		if (!intent || intent.credentialId !== req.params.id) {
			this.oauthService.renderCallbackError(
				res,
				'This authorization link is invalid or has expired. Please request a new one.',
			);
			return;
		}

		// When the link is bound to an n8n user, the clicker must be that user.
		if (intent.userId) {
			const user = isAuthenticatedRequest(req) ? req.user : undefined;

			if (!user) {
				this.eventService.emit('dynamic-credential-authorize-rejected', {
					reason: 'unauthenticated',
					credentialId: intent.credentialId,
				});
				// Absolute, same-origin http(s) URL so SigninView returns here after login.
				const returnUrl = `${this.urlService.getInstanceBaseUrl()}${req.originalUrl}`;
				res.redirect(
					`${this.urlService.getInstanceBaseUrl()}/signin?redirect=${encodeURIComponent(returnUrl)}`,
				);
				return;
			}

			if (user.id !== intent.userId) {
				this.eventService.emit('dynamic-credential-authorize-rejected', {
					reason: 'user-mismatch',
					credentialId: intent.credentialId,
				});
				this.oauthService.renderCallbackError(
					res,
					'This authorization link was issued for a different account. Sign in as the intended user and open the link again.',
				);
				return;
			}
		}

		try {
			const credential = await this.findCredentialToUse(intent.credentialId);

			const csrfData: CreateCsrfStateData = {
				cid: credential.id,
				origin: 'dynamic-credential',
				authorizationHeader: intent.identity ? `Bearer ${intent.identity}` : '',
				authMetadata: intent.metadata,
				credentialResolverId: intent.resolverId,
				userId: intent.userId,
			};

			const authorizationUrl = credential.type.toLowerCase().includes('oauth2')
				? await this.oauthService.generateAOauth2AuthUri(credential, csrfData, req, res)
				: await this.oauthService.generateAOauth1AuthUri(credential, csrfData, req, res);

			res.redirect(authorizationUrl);
		} catch (e) {
			this.oauthService.renderCallbackError(res, ensureError(e).message);
		}
	}

	/**
	 * DELETE /credentials/:credentialId/my-connection
	 *
	 * Deletes the running user's per-user connection row(s) for the given
	 * credential. Users can only disconnect their own connection — the absence
	 * of a `:userId` route segment is intentional.
	 *
	 * Not gated by `credential:read`: a user who has since lost access to the
	 * project (or to the credential) must still be able to clear their own
	 * stored OAuth tokens. The delete is keyed on the caller's userId server
	 * side, so the worst a user can do is clear their own row.
	 */
	@Delete('/:credentialId/my-connection')
	async deleteMyConnection(
		req: AuthenticatedRequest,
		res: Response,
		@Param('credentialId') credentialId: string,
	): Promise<void> {
		const credential = await this.credentialsFinderService.findCredentialById(credentialId);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		const affected = await this.credentialConnectionStatusService.deleteMyConnection(
			req.user.id,
			credentialId,
		);

		if (affected === 0) {
			throw new NotFoundError('No connection to disconnect');
		}

		this.eventService.emit('credentials-user-disconnected', {
			user: req.user,
			credentialId,
			credentialType: credential.type,
		});

		res.status(204).send();
	}
}
