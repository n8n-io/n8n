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

	@Env('N8N_SSO_SAML_LOGIN_LABEL')
	samlLoginLabel: string = '';

	@Env('N8N_SSO_SAML_LOGIN_BINDING')
	samlLoginBinding: string = 'redirect';

	@Env('N8N_SSO_SAML_ACS_BINDING')
	samlAcsBinding: string = 'post';

	@Env('N8N_SSO_SAML_IGNORE_SSL')
	samlIgnoreSsl: boolean = false;

	@Env('N8N_SSO_SAML_AUTHN_REQUESTS_SIGNED')
	samlAuthnRequestsSigned: boolean = false;

	@Env('N8N_SSO_SAML_WANT_ASSERTIONS_SIGNED')
	samlWantAssertionsSigned: boolean = true;

	@Env('N8N_SSO_SAML_WANT_MESSAGE_SIGNED')
	samlWantMessageSigned: boolean = true;

	/** PEM-encoded private key for signing SAML AuthnRequests. */
	@Env('N8N_SSO_SAML_SIGNING_PRIVATE_KEY')
	samlSigningPrivateKey: string = '';

	/** PEM-encoded certificate matching the signing private key. */
	@Env('N8N_SSO_SAML_SIGNING_CERTIFICATE')
	samlSigningCertificate: string = '';

	@Env('N8N_SSO_SAML_RELAY_STATE')
	samlRelayState: string = '';

	// --- SAML attribute mapping ---

	@Env('N8N_SSO_SAML_MAPPING_EMAIL')
	samlMappingEmail: string = '';

	@Env('N8N_SSO_SAML_MAPPING_FIRST_NAME')
	samlMappingFirstName: string = '';

	@Env('N8N_SSO_SAML_MAPPING_LAST_NAME')
	samlMappingLastName: string = '';

	@Env('N8N_SSO_SAML_MAPPING_USER_PRINCIPAL_NAME')
	samlMappingUserPrincipalName: string = '';

	@Env('N8N_SSO_SAML_MAPPING_INSTANCE_ROLE')
	samlMappingInstanceRole: string = '';

	/** Comma-separated list of project role claims (split into array before storing). */
	@Env('N8N_SSO_SAML_MAPPING_PROJECT_ROLES')
	samlMappingProjectRoles: string = '';
}
