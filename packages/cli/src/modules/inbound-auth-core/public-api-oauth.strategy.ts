import type { AuthenticatedRequest, TokenGrant } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { extractBearer, inboundFrom, inboundRequestOf, ResourceAdmission } from '@n8n/inbound-auth';
import {
	getApiKeyScopesForRole,
	isApiKeyScope,
	type ApiKeyScope,
	type Scope,
} from '@n8n/permissions';

import type { AuthStrategy } from '@n8n/backend-services/auth';
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
		private readonly admission: ResourceAdmission,
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

		// Routing, not verification: a bearer another strategy owns is left to it.
		const extracted = extractBearer(inboundFrom(this.resource, inboundRequestOf(req)));
		if (!extracted.ok || !this.isOAuthIssuer(extracted.value.credential.token)) {
			return null;
		}

		const admitted = await this.admission.admit(this.resource, extracted.value);
		if (!admitted.ok) {
			req.res?.setHeader('WWW-Authenticate', await this.admission.challenge(admitted));
			return false;
		}

		const user = await this.userRepository.findByIdWithRole(admitted.context.subject.id);
		if (!user) {
			return false;
		}

		// Only API key scopes narrow the grant. An external IdP's own scopes (`openid`, ...) are
		// ignored, so its users keep the role set until a source can map scopes itself.
		const roleScopes = getApiKeyScopesForRole(user);
		const requested = (admitted.context.tokenScopes ?? []).filter(isApiKeyScopeName);
		req.user = user;
		req.tokenGrant = {
			scopes: user.role.scopes.map((scope) => scope.slug),
			apiKeyScopes:
				requested.length > 0 ? roleScopes.filter((s) => requested.includes(s)) : roleScopes,
			subject: user,
		};
		req.ctx = {
			security: admitted.context,
		};
		return true;
	}
}
