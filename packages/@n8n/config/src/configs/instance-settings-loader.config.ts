import { Config, Env } from '../decorators';

@Config
export class InstanceSettingsLoaderConfig {
	/**
	 * When true, the instance owner is managed via environment variables.
	 * On every startup the owners details will be overriden by what is in the env vars.
	 * When false (default), those env vars are ignored even if set.
	 */
	@Env('N8N_INSTANCE_OWNER_MANAGED_BY_ENV')
	ownerManagedByEnv: boolean = false;

	@Env('N8N_INSTANCE_OWNER_EMAIL')
	ownerEmail: string = '';

	@Env('N8N_INSTANCE_OWNER_FIRST_NAME')
	ownerFirstName: string = 'Instance';

	@Env('N8N_INSTANCE_OWNER_LAST_NAME')
	ownerLastName: string = 'Owner';

	/**
	 * Pre-hashed bcrypt password for the instance owner.
	 * Use when the hash is provided by an external secrets system or deployment pipeline.
	 * WARNING: providing a plaintext password here will result in a broken login.
	 */
	@Env('N8N_INSTANCE_OWNER_PASSWORD_HASH')
	ownerPasswordHash: string = '';

	// --- SSO ---

	/** When true, SSO connection config is read from env vars on every startup and the UI is locked. */
	@Env('N8N_SSO_MANAGED_BY_ENV')
	ssoManagedByEnv: boolean = false;

	/** User role provisioning mode: disabled, instance_role, or instance_and_project_roles. */
	@Env('N8N_SSO_USER_ROLE_PROVISIONING')
	ssoUserRoleProvisioning: string = 'disabled';

	// --- OIDC ---

	@Env('N8N_SSO_OIDC_CLIENT_ID')
	oidcClientId: string = '';

	@Env('N8N_SSO_OIDC_CLIENT_SECRET')
	oidcClientSecret: string = '';

	@Env('N8N_SSO_OIDC_DISCOVERY_ENDPOINT')
	oidcDiscoveryEndpoint: string = '';

	@Env('N8N_SSO_OIDC_LOGIN_ENABLED')
	oidcLoginEnabled: boolean = false;

	/**  Values can be found in packages/@n8n/api-types/src/dto/oidc/config.dto.ts */
	@Env('N8N_SSO_OIDC_PROMPT')
	oidcPrompt: string = 'select_account';

	/** Comma-separated ACR values */
	@Env('N8N_SSO_OIDC_ACR_VALUES')
	oidcAcrValues: string = '';

	/**
	 * When true, security policy settings are managed via environment variables.
	 * On every startup the security policy will be overridden by env vars.
	 * When false (default), security policy env vars are ignored even if set.
	 */
	@Env('N8N_SECURITY_POLICY_MANAGED_BY_ENV')
	securityPolicyManagedByEnv: boolean = false;

	@Env('N8N_MFA_ENFORCED_ENABLED')
	mfaEnforcedEnabled: boolean = false;

	@Env('N8N_PERSONAL_SPACE_PUBLISHING_ENABLED')
	personalSpacePublishingEnabled: boolean = true;

	@Env('N8N_PERSONAL_SPACE_SHARING_ENABLED')
	personalSpaceSharingEnabled: boolean = true;

	// --- SAML ---

	/** XML metadata string from the identity provider. */
	@Env('N8N_SSO_SAML_METADATA')
	samlMetadata: string = '';

	/** URL to fetch SAML metadata from (mutually exclusive with metadata). */
	@Env('N8N_SSO_SAML_METADATA_URL')
	samlMetadataUrl: string = '';

	@Env('N8N_SSO_SAML_LOGIN_ENABLED')
	samlLoginEnabled: boolean = false;

	// --- Log streaming ---

	/**
	 * When true, log streaming destinations are reconciled from env vars on every
	 * startup
	 */
	@Env('N8N_LOG_STREAMING_MANAGED_BY_ENV')
	logStreamingManagedByEnv: boolean = false;

	/**
	 * JSON-encoded array of log streaming destinations.
	 *
	 * @example
	 * ```json
	 * [
	 *   { "type": "webhook", "label": "Audit", "url": "https://hooks.example.com/audit" },
	 *   { "type": "syslog", "label": "SIEM", "host": "syslog.example.com" },
	 *   { "type": "sentry", "label": "Ops", "dsn": "https://public@sentry.example.com/1" }
	 * ]
	 * ```
	 */
	@Env('N8N_LOG_STREAMING_DESTINATIONS')
	logStreamingDestinations: string = '';

	// --- MCP ---
	@Env('N8N_MCP_MANAGED_BY_ENV')
	mcpManagedByEnv: boolean = false;

	@Env('N8N_MCP_ACCESS_ENABLED')
	mcpAccessEnabled: boolean = false;
}
