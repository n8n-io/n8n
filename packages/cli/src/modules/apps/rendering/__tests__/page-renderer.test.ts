import type { AppContent, AppLayout, AppTheme } from '@n8n/api-types';

import { registerStaticRenderers } from '../register-static-renderers';
import { registerBlockRenderer } from '../renderer-registry';
import { renderLayout, renderPage, type PageToRender } from '../page-renderer';

registerStaticRenderers();
// Stands in for the real button renderer, which needs the DI container; it
// echoes the page an action URL would point at.
registerBlockRenderer({
	type: 'button',
	render: async (block, ctx) => `<form data-action='${ctx.actionPageId}/${block.id}'></form>`,
});

const basePage = (content: AppContent, overrides: Partial<PageToRender> = {}): PageToRender => ({
	app: { id: 'app-1', name: 'Acme Portal', namespace: 'acme', projectId: 'p1', theme: null },
	page: { id: 'page-1', route: '', content, path: '/apps/acme' },
	pages: [{ id: 'page-1', route: '', parentPageId: null }],
	layout: null,
	params: {},
	query: {},
	viewer: null,
	baseUrl: 'http://localhost:5678',
	preview: false,
	...overrides,
});

describe('renderPage', () => {
	test('renders the shell with the app name and title, and no token', async () => {
		const { html } = await renderPage(basePage([]));

		expect(html).toContain('Acme Portal');
		expect(html).not.toContain('n8n-app-token');
	});

	test('renders a registered typed block', async () => {
		const { html } = await renderPage(
			basePage([{ id: 'h1', type: 'header', data: { text: 'Hello', level: 1 } }]),
		);

		expect(html).toContain('<h1');
		expect(html).toContain('Hello');
	});

	test('renders the unsupported-block card for a type with no registered renderer', async () => {
		const { html } = await renderPage(
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

	describe('a block whose renderer throws', () => {
		const failing: AppContent = [{ id: 'html1', type: 'html', data: { template: '{{#if}}' } }];

		test('renders as nothing and reports the message under its id, without failing the page', async () => {
			const { html, errors } = await renderPage(
				basePage([...failing, { id: 'h1', type: 'header', data: { text: 'After', level: 1 } }]),
			);

			expect(html).toContain('After');
			expect(html).not.toMatch(/failed|error/i);
			expect(Object.keys(errors)).toEqual(['html1']);
			expect(errors.html1).toContain('Parse error');
			expect(errors.html1).not.toMatch(/\nat /);
		});

		test('reports the message without a stack frame in preview mode too', async () => {
			const { errors } = await renderPage(basePage(failing, { preview: true }));

			const { errors: production } = await renderPage(basePage(failing));
			expect(errors.html1).toBe(production.html1);
			expect(errors.html1).not.toMatch(/\nat /);
		});

		test('reports nothing when every block renders', async () => {
			const { errors } = await renderPage(
				basePage([{ id: 'h1', type: 'header', data: { text: 'Hello', level: 1 } }]),
			);

			expect(errors).toEqual({});
		});
	});

	test('renders every block in order', async () => {
		const { html } = await renderPage(
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
		const { html } = await renderPage(
			themedPage({ colors: { primary: '#ff0000' }, radius: 'sm', fontFamily: 'Inter' }),
		);

		expect(html).toContain('--app-color-primary: #ff0000;');
		expect(html).toContain('--app-radius: var(--radius--sm);');
		expect(html).toContain('--app-font-family: Inter;');
	});

	test('drops a theme value that could close the inline style tag', async () => {
		const { html } = await renderPage(
			themedPage({ colors: { primary: '</style><script>1</script>' } }),
		);

		expect(html).not.toContain('</style><script>');
	});

	test('renders the theme custom CSS in its own <style> after the variables', async () => {
		const { html } = await renderPage(
			themedPage({ colors: { primary: '#ff0000' }, customCss: '.app-main{max-width:80rem}' }),
		);

		expect(html).toContain('<style>.app-main{max-width:80rem}</style>');
		expect(html.indexOf('--app-color-primary')).toBeLessThan(html.indexOf('.app-main{'));
	});

	test('neutralizes a closing tag inside the custom CSS', async () => {
		const { html } = await renderPage(themedPage({ customCss: 'a{}</style><script>1</script>' }));

		expect(html).not.toContain('</style><script>');
		expect(html).toContain('a{}<\\/style><script>1<\\/script></style>');
	});

	test('emits no custom CSS <style> when it is empty', async () => {
		const { html } = await renderPage(themedPage({ customCss: '' }));

		expect(html).not.toContain('<style></style>');
	});

	test('emits no theme <style> when the App has no theme', async () => {
		const { html } = await renderPage(basePage([]));

		expect(html).not.toContain(':root{--app-color');
	});

	describe('layout', () => {
		const layout: AppLayout = [
			{ id: 'banner', type: 'header', data: { text: 'Banner', level: 2 } },
			{ id: 'slot', type: 'slot', data: {} },
			{
				id: 'cta',
				type: 'button',
				data: { label: 'Go', style: 'primary', target: { kind: 'workflow', workflowId: 'wf' } },
			},
		];
		const content: AppContent = [{ id: 'h1', type: 'header', data: { text: 'Body', level: 1 } }];

		test('renders the default shell with the root hook when the page has no layout', async () => {
			const { html } = await renderPage(basePage(content));

			expect(html).toContain("<div class='app-shell' data-app-root>");
			expect(html).toContain("<nav class='app-menu'>");
			expect(html).not.toContain('app-layout');
		});

		test('wraps each layout block by id and puts the content into the slot', async () => {
			const { html } = await renderPage(
				basePage(content, { layout: { blocks: layout, ownerPageId: 'page-1' } }),
			);

			expect(html).toContain("<div class='app-layout' data-app-root>");
			expect(html).toMatch(/<div class='app-block' data-block-id='banner'>\s*<h2/);
			expect(html).toMatch(/<main class='app-main' data-app-slot>\s*<h1[^>]*>Body<\/h1>/);
			expect(html.indexOf('Banner')).toBeLessThan(html.indexOf('Body'));
			expect(html.indexOf('Body')).toBeLessThan(html.indexOf("data-block-id='cta'"));
			expect(html).not.toContain('app-shell');
			expect(html).not.toContain('app-menu');
		});

		test('points a layout block action at the owner page, and a content block at the page', async () => {
			const { html } = await renderPage(
				basePage(
					[
						{
							id: 'own',
							type: 'button',
							data: {
								label: 'Own',
								style: 'primary',
								target: { kind: 'workflow', workflowId: 'w' },
							},
						},
					],
					{ layout: { blocks: layout, ownerPageId: 'parent-page' } },
				),
			);

			expect(html).toContain("data-action='parent-page/cta'");
			expect(html).toContain("data-action='page-1/own'");
		});
	});
});

describe('renderLayout', () => {
	test('renders the layout blocks around an empty slot, without the page shell', async () => {
		const { html } = await renderLayout({
			...basePage([{ id: 'h1', type: 'header', data: { text: 'Body', level: 1 } }]),
			layout: {
				blocks: [
					{ id: 'banner', type: 'header', data: { text: 'Banner', level: 2 } },
					{ id: 'slot', type: 'slot', data: {} },
				],
				ownerPageId: 'page-1',
			},
		});

		expect(html).toContain("<div class='app-layout' data-app-root>");
		expect(html).toContain("data-block-id='banner'");
		expect(html).toContain("<main class='app-main' data-app-slot></main>");
		expect(html).not.toContain('Body');
		expect(html).not.toContain('<html');
	});

	test('reports a failing layout block and leaves its wrapper empty', async () => {
		const { html, errors } = await renderLayout({
			...basePage([]),
			layout: {
				blocks: [
					{ id: 'menu', type: 'html', data: { template: '{{#if}}' } },
					{ id: 'slot', type: 'slot', data: {} },
				],
				ownerPageId: 'page-1',
			},
		});

		expect(html).toMatch(/<div class='app-block' data-block-id='menu'>\s*<\/div>/);
		expect(Object.keys(errors)).toEqual(['menu']);
	});
});
