import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { UserError, type N8nOAuth2FlowResult } from 'n8n-workflow';
import { createHash, randomBytes } from 'node:crypto';
import pkceChallenge from 'pkce-challenge';

import { CacheService } from '@/services/cache/cache.service';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import type { N8nOAuth2Flow } from '@/services/oauth2-flow-proxy.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { OAuthServerService } from './oauth-server.service';

const FLOW_STATE_PREFIX = 'oauth-flow:';
const FLOW_STATE_TTL = 5 * Time.minutes.toMilliseconds;

type FlowState = { codeVerifier: string; resourceUrl: string };

@Service()
export class OAuth2FlowService implements N8nOAuth2Flow {
	constructor(
		private readonly oauthServerService: OAuthServerService,
		private readonly resourceRegistry: ProtectedResourceRegistry,
		private readonly urlService: UrlService,
		private readonly cacheService: CacheService,
		private readonly tokenVerifier: OAuthTokenVerifierProxy,
	) {}

	/**
	 * Begin authorization-code + PKCE for a form trigger: validate the resource is
	 * first-party, stash the PKCE verifier under an unguessable single-use `state`,
	 * and return the `/oauth/authorize` URL to redirect the browser to. For form
	 * triggers client_id = redirect_uri = resource = the trigger URL.
	 */
	async begin(resourceUrl: string): Promise<string> {
		const resource = await this.resourceRegistry.getByResourceUrl(resourceUrl);
		if (!resource?.isFirstParty) {
			throw new UserError(`Not a first-party protected resource: ${resourceUrl}`);
		}

		const { code_verifier, code_challenge } = await pkceChallenge();
		const state = randomBytes(32).toString('hex');
		await this.cacheService.set(
			FLOW_STATE_PREFIX + state,
			{ codeVerifier: code_verifier, resourceUrl } satisfies FlowState,
			FLOW_STATE_TTL,
		);

		const url = new URL(`${this.urlService.getInstanceBaseUrl()}/oauth/authorize`);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('client_id', resourceUrl);
		url.searchParams.set('redirect_uri', resourceUrl);
		url.searchParams.set('resource', resourceUrl);
		url.searchParams.set('code_challenge', code_challenge);
		url.searchParams.set('code_challenge_method', 'S256');
		url.searchParams.set('state', state);
		return url.toString();
	}

	/**
	 * Complete the flow: consume the cached state once, verify PKCE (the SDK token
	 * handler normally does this — we exchange in-process, so replicate the S256
	 * check), exchange the code for an AS token, and validate it against the form's
	 * resource. Ends with a validated token (sub=submitter, aud=form resource).
	 */
	async complete(code: string, state: string): Promise<N8nOAuth2FlowResult> {
		const cacheKey = FLOW_STATE_PREFIX + state;
		const flow = await this.cacheService.get<FlowState>(cacheKey);
		if (!flow) return { valid: false, reason: 'invalid_state' };
		await this.cacheService.delete(cacheKey); // consume-once

		const { codeVerifier, resourceUrl } = flow;

		const client = await this.oauthServerService.clientsStore.getClient(resourceUrl);
		if (!client) return { valid: false, reason: 'invalid_client' };

		try {
			const challenge = await this.oauthServerService.challengeForAuthorizationCode(client, code);
			if (createHash('sha256').update(codeVerifier).digest('base64url') !== challenge) {
				return { valid: false, reason: 'invalid_grant' };
			}

			const tokens = await this.oauthServerService.exchangeAuthorizationCode(
				client,
				code,
				codeVerifier,
				resourceUrl,
				new URL(resourceUrl),
			);

			const result = await this.tokenVerifier.verifyOAuthAccessToken(
				tokens.access_token,
				resourceUrl,
			);
			if (!result.user) {
				return { valid: false, reason: result.context?.reason ?? 'invalid_token' };
			}
			return {
				valid: true,
				token: tokens.access_token,
				user: {
					id: result.user.id,
					email: result.user.email,
					firstName: result.user.firstName,
					lastName: result.user.lastName,
				},
			};
		} catch (error) {
			// A concurrent completion (double-submitted callback) loses the atomic
			// `markAuthorizationCodeAsUsed` race; a missing/used/expired code throws the
			// same way. Surface it as a graceful invalid_grant rather than a thrown 500 —
			// the return contract is a discriminated union, not an exception channel.
			if (error instanceof InvalidGrantError) {
				return { valid: false, reason: 'invalid_grant' };
			}
			throw error;
		}
	}
}
