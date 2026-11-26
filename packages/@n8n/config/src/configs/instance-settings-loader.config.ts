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

	/**
	 * Which roles direct-claim provisioning sets: disabled, instance_role, or
	 * instance_and_project_roles. Ignored when N8N_SSO_SCOPES_USE_EXPRESSION_MAPPING selects
	 * the expression-mapping strategy instead.
	 */
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

	/** Space-separated additional scopes appended to the OIDC authorization request. */
	@Env('N8N_SSO_OIDC_ADDITIONAL_SCOPES')
	oidcAdditionalScopes: string = '';

	@Env('N8N_SSO_OIDC_RP_INITIATED_LOGOUT_ENABLED')
	oidcRpInitiatedLogoutEnabled: boolean = false;

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

	/**
	 * Whether users can request a review of a workflow before they publish it.
	 * n8n reads this only when `N8N_SECURITY_POLICY_MANAGED_BY_ENV` is true.
	 */
	@Env('N8N_WORKFLOW_REVIEWS_ENABLED')
	workflowReviewsEnabled: boolean = false;

	/**
	 * Whether every new version of a workflow in a team project needs an
	 * approved review before anyone can publish it. When false, each project or
	 * workflow sets its own rule. n8n reads this only when
	 * `N8N_SECURITY_POLICY_MANAGED_BY_ENV` is true. It has no effect while
	 * `N8N_WORKFLOW_REVIEWS_ENABLED` is false.
	 */
	@Env('N8N_WORKFLOW_REVIEWS_ALWAYS_REQUIRED')
	workflowReviewsAlwaysRequired: boolean = false;

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

	// --- Skill Sync ---

	/**
	 * Whether environment variables control Skill Sync. When true, n8n applies
	 * `N8N_SKILL_SYNC_ENABLED` on every startup and admins can't change the
	 * setting in the UI. When false, n8n ignores `N8N_SKILL_SYNC_ENABLED`.
	 */
	@Env('N8N_SKILL_SYNC_MANAGED_BY_ENV')
	skillSyncManagedByEnv: boolean = false;

	/**
	 * Whether users can sync skills from GitHub repositories. n8n reads this
	 * only when `N8N_SKILL_SYNC_MANAGED_BY_ENV` is true. Turning it off keeps
	 * the skills that are already synced.
	 */
	@Env('N8N_SKILL_SYNC_ENABLED')
	skillSyncEnabled: boolean = false;

	/**
	 * Whether MCP clients can read and save user preferences. n8n reads this value only when
	 * `N8N_MCP_MANAGED_BY_ENV` is true. When unset, preferences are off on the Enterprise plan
	 * and on for other plans, unless an admin already changed the setting.
	 */
	@Env('N8N_MCP_PREFERENCES_ENABLED')
	mcpPreferencesEnabled?: boolean;

	/**
	 * Whether `N8N_PREFERENCES_ENABLED` controls the Preferences setting. When true, n8n applies
	 * that value on every startup and admins can't change the setting in the UI.
	 */
	@Env('N8N_PREFERENCES_MANAGED_BY_ENV')
	preferencesManagedByEnv: boolean = false;

	/**
	 * Whether users can save preferences that n8n Assistant and MCP clients apply. n8n reads
	 * this value only when `N8N_PREFERENCES_MANAGED_BY_ENV` is true. Turning it off keeps the
	 * saved preferences.
	 */
	@Env('N8N_PREFERENCES_ENABLED')
	preferencesEnabled: boolean = false;

	// --- Community packages ---

	/**
	 * When true, the set of installed community packages is reconciled from env
	 * vars on every startup: missing packages are installed, version mismatches
	 * are corrected, and packages not in the list are uninstalled. The
	 * community-packages UI is locked while this mode is on.
	 */
	@Env('N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV')
	communityPackagesManagedByEnv: boolean = false;

	/**
	 * JSON-encoded array of community packages to reconcile on boot.
	 *
	 * @example
	 * ```json
	 * [
	 *   { "name": "n8n-nodes-foo", "version": "1.2.3" },
	 *   { "name": "n8n-nodes-bar", "version": "0.5.0", "checksum": "sha512-..." }
	 * ]
	 * ```
	 */
	@Env('N8N_COMMUNITY_PACKAGES')
	communityPackages: string = '';
}
