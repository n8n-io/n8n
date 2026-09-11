import { APP_LAYOUT_PRESETS } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { AppCodeRuntime, type RunStaticData } from '../app-code-runtime';
import type { AppPageContext } from '../page-context.factory';

const menu = [
	{ title: 'Home', path: '/apps/my-app', current: false, children: [] },
	{
		title: 'clients',
		path: '/apps/my-app/clients',
		current: true,
		children: [{ title: 'new', path: '/apps/my-app/clients/new', current: false, children: [] }],
	},
];

const staticData: RunStaticData = {
	app: { id: 'app-1', name: 'My & App', namespace: 'my-app', projectId: 'project-1' },
	page: { id: 'page-1', route: 'clients', path: '/apps/my-app/clients' },
	actionPageId: 'page-1',
	blockId: 'block-1',
	params: {},
	query: {},
	viewer: null,
	menu,
	baseUrl: 'https://n8n.example.com',
	components: null,
};

const codeBlocks = APP_LAYOUT_PRESETS.flatMap((preset) =>
	preset.blocks.flatMap((block) =>
		block.type === 'code' ? [[`${preset.id}/${block.id}`, block.data.source] as const] : [],
	),
);

describe('APP_LAYOUT_PRESETS code blocks', () => {
	const runtime = new AppCodeRuntime(mock());

	afterAll(async () => {
		await runtime.dispose();
	});

	test.each(codeBlocks)('%s compiles and renders a vocabulary element', async (_id, source) => {
		const { value } = await runtime.render(source, mock<AppPageContext>(), staticData);

		expect(value).toMatch(
			/^<(header|section|footer|aside) class="app-(header|hero|footer|sidebar)">/,
		);
	});

	test.each(codeBlocks.filter(([id]) => id !== 'sidebar/nav'))(
		'%s renders the app name, escaped',
		async (_id, source) => {
			const { value } = await runtime.render(source, mock<AppPageContext>(), staticData);

			expect(value).toContain('My &amp; App');
		},
	);

	test.each(
		codeBlocks.filter(([id]) => ['top-nav/header', 'sidebar/nav', 'landing/header'].includes(id)),
	)('%s links every menu item and marks the current page', async (_id, source) => {
		const { value } = await runtime.render(source, mock<AppPageContext>(), staticData);

		expect(value).toContain('href="/apps/my-app"');
		expect(value).toContain('<a href="/apps/my-app/clients" aria-current="page">clients</a>');
		expect(value).not.toContain('aria-current="page">Home');
	});
});
