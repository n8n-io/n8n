import { MindeeApi } from '../MindeeApi.credentials';
import { MindeeInvoiceApi } from '../MindeeInvoiceApi.credentials';
import { MindeeReceiptApi } from '../MindeeReceiptApi.credentials';

describe('Mindee credentials', () => {
	describe('MindeeApi', () => {
		const credential = new MindeeApi();

		it('should send the API key in the Authorization header', () => {
			expect(credential.authenticate).toEqual({
				type: 'generic',
				properties: { headers: { Authorization: '={{$credentials.apiKey}}' } },
			});
		});

		it('should test the credential against the model search', () => {
			expect(credential.test.request).toEqual({
				baseURL: 'https://api-v2.mindee.net/v2',
				url: '/search/models',
				qs: { per_page: 1 },
			});
		});

		it('should hide the API key', () => {
			expect(credential.properties).toEqual([
				expect.objectContaining({ name: 'apiKey', typeOptions: { password: true } }),
			]);
		});
	});

	describe.each([
		['MindeeInvoiceApi', new MindeeInvoiceApi()],
		['MindeeReceiptApi', new MindeeReceiptApi()],
	])('%s', (_name, credential) => {
		it('should show the legacy notice and the Mindee icon', () => {
			expect(credential.icon).toBe('file:icons/Mindee.svg');
			expect(credential.properties[0]).toMatchObject({ name: 'deprecationNotice', type: 'notice' });
		});

		it.each([
			[
				'https://api.mindee.net/v1/products/mindee/invoices/v4/predict',
				'Authorization',
				'Token key',
			],
			['https://api.mindee.net/products/invoices/v1/predict', 'X-Inferuser-Token', 'key'],
		])('should authenticate %s with the %s header', async (url, header, value) => {
			const result = await credential.authenticate({ apiKey: 'key' }, { url, headers: {} });

			expect(result.headers).toEqual({ [header]: value });
		});
	});
});
