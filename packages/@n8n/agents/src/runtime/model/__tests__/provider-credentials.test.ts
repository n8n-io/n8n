import {
	hasAzureApiKey,
	hasAzureEntraToken,
	isAzureEntraCredential,
} from '../provider-credentials';

describe('azure-openai auth predicates', () => {
	describe('hasAzureApiKey', () => {
		it('treats a non-empty string as present', () => {
			expect(hasAzureApiKey({ apiKey: 'az-key' })).toBe(true);
		});

		it('treats a whitespace-only string as absent', () => {
			expect(hasAzureApiKey({ apiKey: '   ' })).toBe(false);
		});

		it('treats undefined / non-string as absent', () => {
			expect(hasAzureApiKey({})).toBe(false);
			expect(hasAzureApiKey({ apiKey: undefined })).toBe(false);
			expect(hasAzureApiKey({ apiKey: 123 })).toBe(false);
		});
	});

	describe('hasAzureEntraToken', () => {
		it('treats a stored access_token as Entra', () => {
			expect(hasAzureEntraToken({ oauthTokenData: { access_token: 'stored-token' } })).toBe(true);
		});

		it('treats an oauthTokenData object without access_token as not Entra', () => {
			expect(hasAzureEntraToken({ oauthTokenData: {} })).toBe(false);
		});

		it('treats undefined / non-object oauthTokenData as not Entra', () => {
			expect(hasAzureEntraToken({})).toBe(false);
			expect(hasAzureEntraToken({ oauthTokenData: undefined })).toBe(false);
			expect(hasAzureEntraToken({ oauthTokenData: 'not-an-object' })).toBe(false);
		});
	});

	describe('isAzureEntraCredential', () => {
		it('is Entra when no usable apiKey and a stored access_token', () => {
			expect(isAzureEntraCredential({ oauthTokenData: { access_token: 'stored-token' } })).toBe(
				true,
			);
		});

		it('is not Entra when a usable apiKey is present even with a stored token', () => {
			expect(
				isAzureEntraCredential({
					apiKey: 'az-key',
					oauthTokenData: { access_token: 'stored-token' },
				}),
			).toBe(false);
		});

		it('is not Entra when apiKey is whitespace-only and no token is stored', () => {
			expect(isAzureEntraCredential({ apiKey: '   ' })).toBe(false);
		});
	});
});
