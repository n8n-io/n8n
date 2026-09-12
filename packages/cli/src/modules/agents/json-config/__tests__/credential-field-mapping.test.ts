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
		['volcengine', 'https://ark.cn-beijing.volces.com/api/v3'],
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

	it('passes an unmapped provider through unchanged', () => {
		const raw = { apiKey: 'key', url: 'https://example.com', someOtherField: 'kept' };

		expect(mapCredentialForProvider('not-a-provider', raw)).toEqual(raw);
	});
});
