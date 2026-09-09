import type { AppContent, AppTheme } from '@n8n/api-types';

import { registerStaticRenderers } from '../register-static-renderers';
import { renderPage, type PageToRender } from '../page-renderer';

registerStaticRenderers();

const basePage = (content: AppContent, overrides: Partial<PageToRender> = {}): PageToRender => ({
	app: { id: 'app-1', name: 'Acme Portal', namespace: 'acme', projectId: 'p1', theme: null },
	page: { id: 'page-1', route: '', content, path: '/apps/acme' },
	pages: [{ id: 'page-1', route: '', parentPageId: null }],
	params: {},
	query: {},
	viewer: null,
	baseUrl: 'http://localhost:5678',
	preview: false,
	...overrides,
});

describe('renderPage', () => {
	test('renders the shell with the app name and title, and no token', async () => {
		const html = await renderPage(basePage([]));

		expect(html).toContain('Acme Portal');
		expect(html).not.toContain('n8n-app-token');
	});

	test('renders a registered typed block', async () => {
		const html = await renderPage(
			basePage([{ id: 'h1', type: 'header', data: { text: 'Hello', level: 1 } }]),
		);

		expect(html).toContain('<h1');
		expect(html).toContain('Hello');
	});

	test('renders the unsupported-block card for a type with no registered renderer', async () => {
		const html = await renderPage(
			basePage([
				{
					id: 'b1',
					type: 'table',
					data: { source: { dataTableId: 'dt1' }, limit: 50 },
				},
			]),
		);

		expect(html).toContain('Unsupported block type: table');
	});

	test('renders the error card for a block whose renderer throws, without failing the page', async () => {
		const html = await renderPage(
			basePage([{ id: 'html1', type: 'html', data: { template: '{{#if}}' } }]),
		);

		expect(html).toContain('This block failed to load.');
	});

	test('shows the error message in preview mode', async () => {
		const html = await renderPage(
			basePage([{ id: 'html1', type: 'html', data: { template: '{{#if}}' } }], { preview: true }),
		);

		expect(html).not.toContain('This block failed to load.');
		expect(html).toContain('Block failed to render');
	});

	test('renders every block in order', async () => {
		const html = await renderPage(
			basePage([
				{ id: 'h1', type: 'header', data: { text: 'First', level: 1 } },
				{ id: 'h2', type: 'header', data: { text: 'Second', level: 1 } },
			]),
		);

		expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
	});

	const themedPage = (theme: AppTheme) =>
		basePage([], {
			app: { id: 'app-1', name: 'Acme', namespace: 'acme', projectId: 'p1', theme },
		});

	test('renders theme colors as --app-color-* custom properties', async () => {
		const html = await renderPage(
			themedPage({ colors: { primary: '#ff0000' }, radius: 'sm', fontFamily: 'Inter' }),
		);

		expect(html).toContain('--app-color-primary: #ff0000;');
		expect(html).toContain('--app-radius: var(--radius--sm);');
		expect(html).toContain('--app-font-family: Inter;');
	});

	test('drops a theme value that could close the inline style tag', async () => {
		const html = await renderPage(
			themedPage({ colors: { primary: '</style><script>1</script>' } }),
		);

		expect(html).not.toContain('</style><script>');
	});

	test('renders the theme custom CSS in its own <style> after the variables', async () => {
		const html = await renderPage(
			themedPage({ colors: { primary: '#ff0000' }, customCss: '.app-main{max-width:80rem}' }),
		);

		expect(html).toContain('<style>.app-main{max-width:80rem}</style>');
		expect(html.indexOf('--app-color-primary')).toBeLessThan(html.indexOf('.app-main{'));
	});

	test('neutralizes a closing tag inside the custom CSS', async () => {
		const html = await renderPage(themedPage({ customCss: 'a{}</style><script>1</script>' }));

		expect(html).not.toContain('</style><script>');
		expect(html).toContain('a{}<\\/style><script>1<\\/script></style>');
	});

	test('emits no custom CSS <style> when it is empty', async () => {
		const html = await renderPage(themedPage({ customCss: '' }));

		expect(html).not.toContain('<style></style>');
	});

	test('emits no theme <style> when the App has no theme', async () => {
		const html = await renderPage(basePage([]));

		expect(html).not.toContain(':root{--app-color');
	});
});
