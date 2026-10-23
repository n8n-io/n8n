import { OidcConfigDto } from '../config.dto';

describe('OidcConfigDto', () => {
	it('defaults rpInitiatedLogoutEnabled to false when omitted', () => {
		const result = OidcConfigDto.safeParse({
			clientId: 'n8n-client',
			clientSecret: 'super-secret',
			discoveryEndpoint: 'https://accounts.example.com/.well-known/openid-configuration',
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rpInitiatedLogoutEnabled).toBe(false);
		}
	});
});
