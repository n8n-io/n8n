import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ProtectedResource } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

export const PUBLIC_API_RESOURCE_ID = 'public-api';

/**
 * Protected-resource descriptor for n8n's public REST API, registered with the
 * shared OAuth server on the oauth-server module's init.
 *
 * Registering it is what lets the OAuth token verifier accept service-account
 * (client_credentials) access tokens whose `aud` is the public-API URL — the
 * verifier fails closed for any audience that is not a registered resource.
 */
@Service()
export class PublicApiProtectedResource implements ProtectedResource {
	readonly id = PUBLIC_API_RESOURCE_ID;

	// The instance MCP server owns `isDefault` (it accepts resource-less tokens);
	// the public API only accepts tokens minted with its explicit resource.
	readonly scopes: string[] = [];

	constructor(
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
	) {}

	getResourceUrl(): string {
		const baseUrl = this.urlService.getInstanceBaseUrl().replace(/\/$/, '');
		return `${baseUrl}/${this.globalConfig.publicApi.path}/v1`;
	}

	getAudiences(): string[] {
		return [this.getResourceUrl()];
	}

	async authorize(user: User): Promise<boolean> {
		return !user.disabled;
	}
}
