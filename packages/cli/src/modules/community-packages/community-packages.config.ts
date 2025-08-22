import { Config, Env } from '@n8n/config';

@Config
export class CommunityPackagesConfig {
	/** Whether to enable community packages */
	@Env('N8N_COMMUNITY_PACKAGES_ENABLED')
	enabled: boolean = true;

	/** NPM registry URL to pull community packages from */
	@Env('N8N_COMMUNITY_PACKAGES_REGISTRY')
	registry: string = 'https://registry.npmjs.org';

	/** Whether to reinstall any missing community packages */
	@Env('N8N_REINSTALL_MISSING_PACKAGES')
	reinstallMissing: boolean = false;

	/** Whether to block installation of not verified packages */
	@Env('N8N_UNVERIFIED_PACKAGES_ENABLED')
	unverifiedEnabled: boolean = true;

	/** Whether to enable and show search suggestion of packages verified by n8n */
	@Env('N8N_VERIFIED_PACKAGES_ENABLED')
	verifiedEnabled: boolean = true;

	/** Whether to load community packages */
	@Env('N8N_COMMUNITY_PACKAGES_PREVENT_LOADING')
	preventLoading: boolean = false;
}
