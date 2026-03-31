import { Config, Env } from '../decorators';

@Config
export class BootstrapConfig {
	/** Seed the instance owner on first boot. Ignored if owner already exists. */
	@Env('N8N_INIT_OWNER_EMAIL')
	ownerEmail: string = '';

	@Env('N8N_INIT_OWNER_FIRST_NAME')
	ownerFirstName: string = '';

	@Env('N8N_INIT_OWNER_LAST_NAME')
	ownerLastName: string = '';

	/** Prefer N8N_INIT_OWNER_PASSWORD_FILE in production. */
	@Env('N8N_INIT_OWNER_PASSWORD')
	ownerPassword: string = '';

	/**
	 * Pre-hashed bcrypt password for the owner. Takes precedence over N8N_INIT_OWNER_PASSWORD.
	 * Use when the hash is provided by an external secrets system.
	 * WARNING: providing a plaintext password here will result in a broken login.
	 * Supports the _FILE suffix for Docker secrets / vault injection.
	 */
	@Env('N8N_INIT_OWNER_PASSWORD_HASH')
	ownerPasswordHash: string = '';

	/** Path to a JSON file containing OIDC provider config. Seeded once on first boot. */
	@Env('N8N_INIT_SSO_OIDC_CONFIG_FILE')
	ssoOidcConfigFile: string = '';

	/** Path to a JSON file containing SAML provider config. Seeded once on first boot. */
	@Env('N8N_INIT_SSO_SAML_CONFIG_FILE')
	ssoSamlConfigFile: string = '';

	/** Label for the bootstrap API key. Required to activate this step. Seeded once on first boot. */
	@Env('N8N_INIT_API_KEY_LABEL')
	apiKeyLabel: string = '';

	/** Comma-separated list of scopes for the bootstrap API key (e.g. workflow:read,workflow:create). */
	@Env('N8N_INIT_API_KEY_SCOPES')
	apiKeyScopes: string = '';

	/** Path to write the generated API key to. The file is created with mode 0o600. */
	@Env('N8N_INIT_API_KEY_OUTPUT_FILE')
	apiKeyOutputFile: string = '';

	/** Path to a JSON file listing community packages to install on first boot. */
	@Env('N8N_INIT_COMMUNITY_PACKAGES_FILE')
	communityPackagesFile: string = '';
}
