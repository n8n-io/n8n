import { SamlPreferences } from '../saml-preferences.dto';

describe('SamlPreferences', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid minimal configuration',
				request: {
					mapping: {
						email: 'user@example.com',
						firstName: 'John',
						lastName: 'Doe',
						userPrincipalName: 'johndoe',
					},
					metadata: '<xml>metadata</xml>',
					metadataUrl: 'https://example.com/metadata',
					loginEnabled: true,
					loginLabel: 'Login with SAML',
				},
			},
			{
				name: 'valid full configuration',
				request: {
					mapping: {
						email: 'user@example.com',
						firstName: 'John',
						lastName: 'Doe',
						userPrincipalName: 'johndoe',
					},
					metadata: '<xml>metadata</xml>',
					metadataUrl: 'https://example.com/metadata',
					ignoreSSL: true,
					loginBinding: 'post',
					loginEnabled: true,
					loginLabel: 'Login with SAML',
					authnRequestsSigned: true,
					wantAssertionsSigned: true,
					wantMessageSigned: true,
					acsBinding: 'redirect',
					signatureConfig: {
						prefix: 'ds',
						location: {
							reference: '/samlp:Response/saml:Issuer',
							action: 'after',
						},
					},
					relayState: 'https://example.com/relay',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = SamlPreferences.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid loginBinding',
				request: {
					loginBinding: 'invalid',
				},
				expectedErrorPath: ['loginBinding'],
			},
			{
				name: 'invalid acsBinding',
				request: {
					acsBinding: 'invalid',
				},
				expectedErrorPath: ['acsBinding'],
			},
			{
				name: 'invalid signatureConfig location action',
				request: {
					signatureConfig: {
						prefix: 'ds',
						location: {
							reference: '/samlp:Response/saml:Issuer',
							action: 'invalid',
						},
					},
				},
				expectedErrorPath: ['signatureConfig', 'location', 'action'],
			},
			{
				name: 'missing signatureConfig location reference',
				request: {
					signatureConfig: {
						prefix: 'ds',
						location: {
							action: 'after',
						},
					},
				},
				expectedErrorPath: ['signatureConfig', 'location', 'reference'],
			},
			{
				name: 'invalid mapping email',
				request: {
					mapping: {
						email: 123,
						firstName: 'John',
						lastName: 'Doe',
						userPrincipalName: 'johndoe',
					},
				},
				expectedErrorPath: ['mapping', 'email'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = SamlPreferences.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});

		describe('Edge cases', () => {
			test('should handle optional fields correctly', () => {
				const validRequest = {
					mapping: undefined,
					metadata: undefined,
					metadataUrl: undefined,
					loginEnabled: undefined,
					loginLabel: undefined,
				};

				const result = SamlPreferences.safeParse(validRequest);
				expect(result.success).toBe(true);
			});

			test('should handle default values correctly', () => {
				const validRequest = {};

				const result = SamlPreferences.safeParse(validRequest);
				expect(result.success).toBe(true);
				expect(result.data?.ignoreSSL).toBe(false);
				expect(result.data?.loginBinding).toBe('redirect');
				expect(result.data?.authnRequestsSigned).toBe(false);
				expect(result.data?.wantAssertionsSigned).toBe(true);
				expect(result.data?.wantMessageSigned).toBe(true);
				expect(result.data?.acsBinding).toBe('post');
				expect(result.data?.signatureConfig).toEqual({
					prefix: 'ds',
					location: {
						reference: '/samlp:Response/saml:Issuer',
						action: 'after',
					},
				});
				expect(result.data?.relayState).toBe('');
			});
		});
	});
});
