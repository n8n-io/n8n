import { OidcConfigDto, UpdateOidcConfigurationDto } from '../config.dto';

describe('UpdateOidcConfigurationDto', () => {
	it('requires every OidcConfigDto field (stays strict)', () => {
		const baseKeys = Object.keys(OidcConfigDto.schema.shape).sort();
		const strictKeys = Object.keys(UpdateOidcConfigurationDto.schema.shape).sort();
		expect(strictKeys).toEqual(baseKeys);

		const result = UpdateOidcConfigurationDto.safeParse({});
		expect(result.success).toBe(false);

		// An empty body must report every field as missing. A field that carries a
		// default would parse successfully instead of erroring.
		const missing = result.success
			? []
			: [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(baseKeys);
	});

	it('accepts a full body', () => {
		const result = UpdateOidcConfigurationDto.safeParse({
			clientId: 'n8n-client',
			clientSecret: 'super-secret',
			discoveryEndpoint: 'https://accounts.example.com/.well-known/openid-configuration',
			loginEnabled: false,
			prompt: 'consent',
			authenticationContextClassReference: ['mfa'],
			additionalScopes: 'groups',
		});
		expect(result.success).toBe(true);
	});
});
