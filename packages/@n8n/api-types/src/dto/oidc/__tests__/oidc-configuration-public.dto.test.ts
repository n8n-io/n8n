import { OidcConfigurationPublicDto } from '../oidc-configuration-public.dto';

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
