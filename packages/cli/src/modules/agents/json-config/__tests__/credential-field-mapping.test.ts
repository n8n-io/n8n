import {
	isSupportedAgentProvider,
	mapCredentialForProvider,
	SUPPORTED_AGENT_PROVIDERS,
} from '../credential-field-mapping';

describe('mapCredentialForProvider', () => {
	describe.each([
		['moonshotai', 'https://api.moonshot.cn/v1'],
		['minimax', 'https://api.minimaxi.com/v1'],
		['alibaba', 'https://cn-hongkong.dashscope.aliyuncs.com'],
	])('%s', (provider, url) => {
		it("maps the credential's region-derived url onto baseURL", () => {
			expect(mapCredentialForProvider(provider, { apiKey: 'key', url })).toEqual({
				apiKey: 'key',
				baseURL: url,
			});
		});

		it('is a supported agent provider', () => {
			expect(isSupportedAgentProvider(provider)).toBe(true);
			expect(SUPPORTED_AGENT_PROVIDERS).toContain(provider);
		});
	});

	describe.each(['openai', 'anthropic'])('%s custom header', (provider) => {
		const url = 'https://gateway.example.com/v1';

		it('forwards the custom header configured on the credential', () => {
			expect(
				mapCredentialForProvider(provider, {
					apiKey: 'key',
					url,
					header: true,
					headerName: 'x-custom-header',
					headerValue: 'value',
				}),
			).toEqual({ apiKey: 'key', baseURL: url, headers: { 'x-custom-header': 'value' } });
		});

		it('omits headers when the custom header is switched off', () => {
			expect(
				mapCredentialForProvider(provider, {
					apiKey: 'key',
					url,
					header: false,
					headerName: 'x-custom-header',
					headerValue: 'value',
				}),
			).toEqual({ apiKey: 'key', baseURL: url });
		});

		it('omits headers when the header name is empty', () => {
			expect(
				mapCredentialForProvider(provider, {
					apiKey: 'key',
					url,
					header: true,
					headerName: '',
					headerValue: 'value',
				}),
			).toEqual({ apiKey: 'key', baseURL: url });
		});

		it('maps a credential without header fields to apiKey and baseURL', () => {
			expect(mapCredentialForProvider(provider, { apiKey: 'key', url })).toEqual({
				apiKey: 'key',
				baseURL: url,
			});
		});
	});

	it('passes an unmapped provider through unchanged', () => {
		const raw = { apiKey: 'key', url: 'https://example.com', someOtherField: 'kept' };

		expect(mapCredentialForProvider('not-a-provider', raw)).toEqual(raw);
	});
});
