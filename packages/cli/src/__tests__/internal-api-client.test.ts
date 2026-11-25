import { resolveInternalApiClient } from '@/internal-api-client';

describe('resolveInternalApiClient', () => {
	it('returns editor_ui for the Editor UI marker value', () => {
		expect(resolveInternalApiClient('editor-ui')).toBe('editor_ui');
	});

	it.each(['n8n-node', 'n8n-cli', 'foo'])('returns other for the %s marker value', (received) => {
		expect(resolveInternalApiClient(received)).toBe('other');
	});

	it('ignores case and surrounding whitespace', () => {
		expect(resolveInternalApiClient(' Editor-UI ')).toBe('editor_ui');
	});

	it('returns other when the header is absent', () => {
		expect(resolveInternalApiClient(undefined)).toBe('other');
	});

	it('uses the first value of a repeated header', () => {
		expect(resolveInternalApiClient(['editor-ui', 'foo'])).toBe('editor_ui');
		expect(resolveInternalApiClient(['foo', 'editor-ui'])).toBe('other');
	});
});
