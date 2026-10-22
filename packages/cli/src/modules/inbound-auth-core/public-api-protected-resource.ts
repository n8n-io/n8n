import type { ConsentUiHints } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ProtectedResource, ResourceUser } from '@n8n/inbound-auth';
import { ALL_API_KEY_SCOPES, getApiKeyScopesForRole } from '@n8n/permissions';

/** The public API at `/api/v1` as an OAuth 2.1 protected resource on the `public-api` surface. */
@Service()
export class PublicApiProtectedResource implements ProtectedResource {
	readonly id = 'public-api';

	readonly surface = 'public-api' as const;

	readonly displayName = 'n8n public API';

	readonly uiHints: ConsentUiHints = { icon: 'key-round', consentType: 'api' };

	readonly scopes: string[] = [...ALL_API_KEY_SCOPES];

	constructor(
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly licenseState: LicenseState,
	) {}

	getResourceUrl(): string {
		const baseUrl = this.urlService.getInstanceBaseUrl().replace(/\/$/, '');
		return `${baseUrl}/${this.globalConfig.publicApi.path}/v1`;
	}

	getAudiences(): string[] {
		return [this.getResourceUrl()];
	}

	async isAvailable(): Promise<boolean> {
		return !this.globalConfig.publicApi.disabled && !this.licenseState.isAPIDisabled();
	}

	async authorize(): Promise<boolean> {
		return await this.isAvailable();
	}

	async getGrantableScopes(user: ResourceUser): Promise<string[]> {
		return getApiKeyScopesForRole(user);
	}
}
