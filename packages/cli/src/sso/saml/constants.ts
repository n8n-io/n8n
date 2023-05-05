export class SamlUrls {
	static readonly samlRESTRoot = '/rest/sso/saml';

	static readonly initSSO = '/initsso';

	static readonly acs = '/acs';

	static readonly restAcs = this.samlRESTRoot + this.acs;

	static readonly metadata = '/metadata';

	static readonly restMetadata = this.samlRESTRoot + this.metadata;

	static readonly config = '/config';

	static readonly configTest = '/config/test';

	static readonly configTestReturn = '/config/test/return';

	static readonly configToggleEnabled = '/config/toggle';

	static readonly defaultRedirect = '/';

	static readonly samlOnboarding = '/saml/onboarding';
}

export const SAML_PREFERENCES_DB_KEY = 'features.saml';

export const SAML_LOGIN_LABEL = 'sso.saml.loginLabel';

export const SAML_LOGIN_ENABLED = 'sso.saml.loginEnabled';
