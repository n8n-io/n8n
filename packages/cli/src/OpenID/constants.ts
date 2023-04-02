export const OPENID_FEATURE_ENABLED = 'enterprise.features.openid';

export const OPENID_FEATURE_NAME = 'features.openid';

export const OPENID_LOGIN_ENABLED = 'sso.openid.loginEnabled';

export const OPENID_SERVICE_PROVIDER = 'sso.openid.serviceProvider';

export const OPENID_BUTTON_NAME = 'sso.openid.buttonName';

export const OPENID_CONFIG_SCHEMA = {
	$schema: 'https://json-schema.org/draft/2019-09/schema',
	type: 'object',
	properties: {
		loginEnabled: {
			type: 'boolean',
		},
		serviceProvider: {
			type: 'string',
		},
		clientId: {
			type: 'string',
		},
		clientSecret: {
			type: 'string',
		},
		discoveryEndpoint: {
			type: 'string',
		},
		buttonName: {
			type: 'string',
		},
	},
	required: ['loginEnabled', 'serviceProvider', 'clientId', 'clientSecret', 'discoveryEndpoint'],
	additionalProperties: false,
};
