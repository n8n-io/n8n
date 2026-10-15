import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	AuthenticationPipeline,
	AuthenticationService,
	extractBearer,
	inboundFrom,
} from '@n8n/inbound-auth';
import {
	getApiKeyScopesForRole,
	isApiKeyScope,
	type ApiKeyScope,
	type Scope,
} from '@n8n/permissions';

import type { AuthStrategy } from '@/services/auth-strategy.types';
import { JwtService } from '@n8n/backend-services';

import { PublicApiProtectedResource } from './public-api-protected-resource';

// Token scopes arrive as plain strings; `isApiKeyScope` only takes known scope names.
const isApiKeyScopeName = (scope: string): scope is ApiKeyScope =>
	isApiKeyScope(scope as Scope | ApiKeyScope);

/**
 * Sends `Authorization: Bearer` JWTs from an OAuth2 issuer through the inbound-auth pipeline.
 * API keys and token-exchange JWTs stay with their own strategies.
 */
@Service()
export class PublicApiOAuthStrategy implements AuthStrategy {
	constructor(
		private readonly resource: PublicApiProtectedResource,
		private readonly pipeline: AuthenticationPipeline,
		private readonly authenticationService: AuthenticationService,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
	) {}

	async buildTokenGrant(): Promise<TokenGrant | false | null> {
		return null;
	}

	private isOAuthIssuer(token: string): boolean {
		const iss: unknown = this.jwtService.decodeUnverified<{ iss?: unknown } | null>(token)?.iss;
		return typeof iss === 'string' && URL.canParse(iss) && /^https?:$/.test(new URL(iss).protocol);
	}

	async authenticate(req: AuthenticatedRequest): Promise<boolean | null> {
		const isAvailable = await this.resource.isAvailable();
		if (!isAvailable) {
			return null;
		}

		const inbound = inboundFrom(this.resource, {
			method: req.method,
			url: req.originalUrl,
			headers: req.headers,
			ip: req.ip ?? '',
		});
		const extracted = extractBearer(inbound);
		if (!extracted.ok || !this.isOAuthIssuer(extracted.value.credential.token)) {
			return null;
		}

		const result = await this.pipeline.run(extracted.value);
		if (!result.ok) {
			const { challenges } = await this.authenticationService.advertise(inbound);

			req.res?.setHeader(
				'WWW-Authenticate',
				`${challenges[0] ?? 'Bearer'}, error="invalid_token", error_description="${result.reason}"`,
			);
			return false;
		}

		const user = await this.userRepository.findByIdWithRole(result.value.subject.id);
		if (!user) {
			return false;
		}

		// Only API key scopes narrow the grant. An external IdP's own scopes (`openid`, ...) are
		// ignored, so its users keep the role set until a source can map scopes itself.
		const roleScopes = getApiKeyScopesForRole(user);
		const requested = (result.value.tokenScopes ?? []).filter(isApiKeyScopeName);
		req.user = user;
		req.tokenGrant = {
			scopes: user.role.scopes.map((scope) => scope.slug),
			apiKeyScopes:
				requested.length > 0 ? roleScopes.filter((s) => requested.includes(s)) : roleScopes,
			subject: user,
		};
		req.ctx = {
			security: result.value,
		};
		return true;
	}
}
