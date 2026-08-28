import { UNTRUSTED_CONTENT_DOCTRINE } from '../shared-prompts';

describe('UNTRUSTED_CONTENT_DOCTRINE', () => {
	it('covers every model-facing MCP result form', () => {
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('results from connected MCP servers');
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('structured data');
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('resources');
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('media');
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('errors');
		expect(UNTRUSTED_CONTENT_DOCTRINE).toContain('stored result pages');
	});
});
