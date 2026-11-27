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
		expect(
			resolveClientHeader({
				headerValue: received,
				clientByHeaderValue: CLIENT_BY_HEADER_VALUE,
				fallback: 'other',
			}),
		).toBe(expectedClient);
	});

	it('ignores case and surrounding whitespace', () => {
		expect(
			resolveClientHeader({
				headerValue: ' Editor-UI ',
				clientByHeaderValue: CLIENT_BY_HEADER_VALUE,
				fallback: 'other',
			}),
		).toBe('editor_ui');
	});

	it('returns the fallback when the header is absent', () => {
		expect(
			resolveClientHeader({
				headerValue: undefined,
				clientByHeaderValue: CLIENT_BY_HEADER_VALUE,
				fallback: 'other',
			}),
		).toBe('other');
	});

	it('uses the first value of a repeated header', () => {
		expect(
			resolveClientHeader({
				headerValue: ['editor-ui', 'foo'],
				clientByHeaderValue: CLIENT_BY_HEADER_VALUE,
				fallback: 'other',
			}),
		).toBe('editor_ui');
		expect(
			resolveClientHeader({
				headerValue: ['foo', 'editor-ui'],
				clientByHeaderValue: CLIENT_BY_HEADER_VALUE,
				fallback: 'other',
			}),
		).toBe('other');
	});
});
