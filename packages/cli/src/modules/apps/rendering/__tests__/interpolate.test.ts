import type { BlockRenderContext } from '../types';
import { interpolate } from '../interpolate';

const ctx = (overrides: Partial<BlockRenderContext> = {}): BlockRenderContext => ({
	app: {
		id: 'app-1',
		name: 'App',
		namespace: 'app',
		projectId: 'p1',
		theme: null,
		components: null,
	},
	page: { id: 'page-1', route: '', path: '/apps/app' },
	actionPageId: 'page-1',
	menu: [],
	params: { id: '42' },
	query: { q: 'search' },
	viewer: { id: 'user-1', email: 'user@example.com' },
	baseUrl: 'http://localhost:5678',
	preview: false,
	...overrides,
});

describe('interpolate', () => {
	test('replaces a params placeholder', () => {
		expect(interpolate('Client {{ params.id }}', ctx())).toBe('Client 42');
	});

	test('replaces a query placeholder', () => {
		expect(interpolate('Search: {{query.q}}', ctx())).toBe('Search: search');
	});

	test('replaces viewer.id and viewer.email', () => {
		expect(interpolate('{{ viewer.id }} / {{ viewer.email }}', ctx())).toBe(
			'user-1 / user@example.com',
		);
	});

	test('replaces an unknown key with an empty string', () => {
		expect(interpolate('{{ params.missing }}', ctx())).toBe('');
	});

	test('replaces viewer placeholders with an empty string when there is no viewer', () => {
		expect(interpolate('{{ viewer.id }}', ctx({ viewer: null }))).toBe('');
	});

	test('does not walk the prototype chain for a key like "toString"', () => {
		expect(interpolate('{{ params.toString }}', ctx())).toBe('');
	});

	test('leaves text with no placeholders unchanged', () => {
		expect(interpolate('Just plain text', ctx())).toBe('Just plain text');
	});
});
