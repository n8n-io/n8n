import { JotFormApi } from '../JotFormApi.credentials';

describe('JotFormApi credential test', () => {
	it('should test the credential against the resolved base URL', () => {
		const credential = new JotFormApi();

		expect(credential.name).toBe('jotFormApi');
		expect(credential.test.request).toEqual({
			baseURL:
				'={{ "https://" + ($credentials.apiDomain === "custom" ? $credentials.customApiDomain : $credentials.apiDomain).replace(new RegExp("^https?://", "i"), "").replace(new RegExp("/{2,}", "g"), "/").replace(new RegExp("/+$"), "") }}',
			url: '/user',
			method: 'GET',
			headers: {
				APIKEY: '={{ $credentials.apiKey }}',
			},
		});
	});
});
