export class SamlUrls {
	static readonly samlRESTRoot = '/rest/sso/saml';

	static readonly initSSO = '/initsso';

	static readonly restInitSSO = this.samlRESTRoot + this.initSSO;

	static readonly acs = '/acs';

	static readonly restAcs = this.samlRESTRoot + this.acs;

	static readonly metadata = '/metadata';

	static readonly restMetadata = this.samlRESTRoot + this.metadata;

	static readonly config = '/config';

	static readonly restConfig = this.samlRESTRoot + this.config;

	static readonly defaultRedirect = '/';

	static readonly samlOnboarding = '/settings/personal'; // TODO:SAML: implement signup page
}

export const SAML_PREFERENCES_DB_KEY = 'features.saml';

export const SAML_ENTERPRISE_FEATURE_ENABLED = 'enterprise.features.saml';

export const SAML_LOGIN_LABEL = 'sso.saml.loginLabel';

export const SAML_LOGIN_ENABLED = 'sso.saml.loginEnabled';
