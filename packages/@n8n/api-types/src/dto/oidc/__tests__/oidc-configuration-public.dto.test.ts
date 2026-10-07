import assert from 'node:assert';

import {
	OidcConfigurationPublicDto,
	UpdateOidcConfigurationPublicDto,
} from '../oidc-configuration-public.dto';

const configuration = {
	clientId: 'n8n-client',
	clientSecret: '__n8n_CLIENT_SECRET_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6',
	discoveryEndpoint: 'https://accounts.example.com/.well-known/openid-configuration',
	loginEnabled: true,
	prompt: 'consent',
	authenticationContextClassReference: ['mfa', 'pwd'],
	additionalScopes: 'groups roles',
	emailVerifiedRequired: true,
	rpInitiatedLogoutEnabled: true,
};

describe('OidcConfigurationPublicDto', () => {
	test('accepts all the expected fields', () => {
		expect(OidcConfigurationPublicDto.safeParse(configuration).success).toBe(true);
	});

	test('accepts the default configuration of a fresh instance', () => {
		const result = OidcConfigurationPublicDto.safeParse({
			...configuration,
			clientSecret: '',
			loginEnabled: false,
			prompt: 'select_account',
			authenticationContextClassReference: [],
			additionalScopes: '',
			emailVerifiedRequired: false,
			rpInitiatedLogoutEnabled: false,
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['a prompt outside the set', { prompt: 'always' }],
		['a string for loginEnabled', { loginEnabled: 'false' }],
		['a string instead of the ACR array', { authenticationContextClassReference: 'mfa' }],
		['a missing emailVerifiedRequired', { emailVerifiedRequired: undefined }],
	])('rejects %s', (_, override) => {
		const result = OidcConfigurationPublicDto.safeParse({ ...configuration, ...override });

		expect(result.success).toBe(false);
	});
});

describe('UpdateOidcConfigurationPublicDto', () => {
	test('accepts a full body', () => {
		expect(UpdateOidcConfigurationPublicDto.safeParse(configuration).success).toBe(true);
	});

	test('reports every field as missing for an empty body', () => {
		const result = UpdateOidcConfigurationPublicDto.safeParse({});

		assert(!result.success, 'Expected validation to fail for an empty body');

		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(Object.keys(configuration).sort());
	});

	test.each([
		['an unknown key', { extra: true }],
		['an empty clientId', { clientId: '' }],
		['an empty clientSecret', { clientSecret: '' }],
		['a discovery endpoint that is not a URL', { discoveryEndpoint: 'not-a-url' }],
		['a prompt outside the set', { prompt: 'always' }],
		['a missing loginEnabled', { loginEnabled: undefined }],
	])('rejects %s', (_, override) => {
		const result = UpdateOidcConfigurationPublicDto.safeParse({ ...configuration, ...override });

		expect(result.success).toBe(false);
	});
});
