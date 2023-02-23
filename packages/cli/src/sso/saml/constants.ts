import { LICENSE_FEATURES } from '../../constants';

export class SamlUrls {
	static readonly initSSO = '/initsso';

	static readonly acs = '/acs';

	static readonly metadata = '/metadata';

	static readonly config = '/config';

	static readonly signup = ''; // TODO:SAML: implement signup
}

const samlRoot = '/rest/sso/saml';

export class SamlEndpoints {
	static readonly initSSO = samlRoot + '/initsso';

	static readonly acs = samlRoot + '/acs';

	static readonly metadata = samlRoot + '/metadata';

	static readonly config = samlRoot + '/config';

	static readonly signup = ''; // TODO:SAML: implement signup
}

export const SAML_PREFERENCES_DB_KEY = 'features.saml';
