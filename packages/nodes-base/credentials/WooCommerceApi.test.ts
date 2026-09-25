import { WooCommerceApi } from './WooCommerceApi.credentials';
import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

describe('WooCommerceApi', () => {
	let wooCommerceApi: WooCommerceApi;

	beforeEach(() => {
		wooCommerceApi = new WooCommerceApi();
	});

	describe('authenticate', () => {
		it('should use Basic Auth by default', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				consumerKey: 'test_key',
				consumerSecret: 'test_secret',
				includeCredentialsInQuery: false,
			};

			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/api',
			};

			const result = await wooCommerceApi.authenticate(credentials, requestOptions);

			expect(result.auth).toEqual({
				user: 'test_key',
				password: 'test_secret',
			});
			expect(result.qs).toBeUndefined();
		});

		it('should use query parameters when includeCredentialsInQuery is true', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				consumerKey: 'test_key',
				consumerSecret: 'test_secret',
				includeCredentialsInQuery: true,
			};

			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/api',
			};

			const result = await wooCommerceApi.authenticate(credentials, requestOptions);

			expect(result.qs).toEqual({
				consumer_key: 'test_key',
				consumer_secret: 'test_secret',
			});
			expect(result.auth).toBeUndefined();
		});

		it('should handle existing query parameters', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				consumerKey: 'test_key',
				consumerSecret: 'test_secret',
				includeCredentialsInQuery: true,
			};

			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/api',
				qs: { existing: 'param' },
			};

			const result = await wooCommerceApi.authenticate(credentials, requestOptions);

			expect(result.qs).toEqual({
				existing: 'param',
				consumer_key: 'test_key',
				consumer_secret: 'test_secret',
			});
		});

		it('should handle non-string credentials gracefully', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				consumerKey: null,
				consumerSecret: undefined,
				includeCredentialsInQuery: false,
			};

			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/api',
			};

			const result = await wooCommerceApi.authenticate(credentials, requestOptions);

			expect(result.auth).toEqual({
				user: '',
				password: '',
			});
		});
	});
});
