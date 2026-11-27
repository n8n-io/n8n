import { resolveClientHeader } from '@/client-header';

type Client = 'editor_ui' | 'n8n_cli' | 'other';

const CLIENT_BY_HEADER_VALUE = new Map<string, Client>([
	['editor-ui', 'editor_ui'],
	['n8n-cli', 'n8n_cli'],
]);

describe('resolveClientHeader', () => {
	it.each([
		['editor_ui', 'editor-ui'],
		['n8n_cli', 'n8n-cli'],
		['other', 'foo'],
	])('returns the %s client for the %s header value', (expectedClient, received) => {
		expect(resolveClientHeader(received, CLIENT_BY_HEADER_VALUE, 'other')).toBe(expectedClient);
	});

	it('ignores case and surrounding whitespace', () => {
		expect(resolveClientHeader(' Editor-UI ', CLIENT_BY_HEADER_VALUE, 'other')).toBe('editor_ui');
	});

	it('returns the fallback when the header is absent', () => {
		expect(resolveClientHeader(undefined, CLIENT_BY_HEADER_VALUE, 'other')).toBe('other');
	});

	it('uses the first value of a repeated header', () => {
		expect(resolveClientHeader(['editor-ui', 'foo'], CLIENT_BY_HEADER_VALUE, 'other')).toBe(
			'editor_ui',
		);
		expect(resolveClientHeader(['foo', 'editor-ui'], CLIENT_BY_HEADER_VALUE, 'other')).toBe(
			'other',
		);
	});
});
