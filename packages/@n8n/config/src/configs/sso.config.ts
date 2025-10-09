import { Config, Env, Nested } from '../decorators';

@Config
class SamlConfig {
	/** Whether to enable SAML SSO. */
	@Env('N8N_SSO_SAML_LOGIN_ENABLED')
	loginEnabled: boolean = false;

	@Env('N8N_SSO_SAML_LOGIN_LABEL')
	loginLabel: string = '';
}

@Config
class OidcConfig {
	/** Whether to enable OIDC SSO. */
	@Env('N8N_SSO_OIDC_LOGIN_ENABLED')
	loginEnabled: boolean = false;
}

@Config
class LdapConfig {
	/** Whether to enable LDAP SSO. */
	@Env('N8N_SSO_LDAP_LOGIN_ENABLED')
	loginEnabled: boolean = false;

	@Env('N8N_SSO_LDAP_LOGIN_LABEL')
	loginLabel: string = '';
}

@Config
export class SsoConfig {
	/** Whether to create users when they log in via SSO. */
	@Env('N8N_SSO_JUST_IN_TIME_PROVISIONING')
	justInTimeProvisioning: boolean = true;

	/** Whether to redirect users from the login dialog to initialize SSO flow. */
	@Env('N8N_SSO_REDIRECT_LOGIN_TO_SSO')
	redirectLoginToSso: boolean = true;

	@Nested
	saml: SamlConfig;

	@Nested
	oidc: OidcConfig;

	@Nested
	ldap: LdapConfig;
}
