import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { CodeBlock } from '@n8n/api-types';

import { AppCodeRuntime } from '../../../runtime/app-code-runtime';
import { PageContextFactory } from '../../../runtime/page-context.factory';
import type { AppPageContext } from '../../../runtime/page-context.factory';
import type { BlockRenderContext } from '../../types';
import { codeBlockRenderer } from '../code.renderer';

function ctx(preview: boolean): BlockRenderContext {
	return {
		app: {
			id: 'app-1',
			name: 'My App',
			namespace: 'my-app',
			projectId: 'project-1',
			theme: null,
			components: null,
		},
		page: { id: 'page-1', route: '', path: '/apps/my-app' },
		actionPageId: 'page-1',
		menu: [],
		params: {},
		query: {},
		viewer: null,
		baseUrl: 'https://n8n.example.com',
		preview,
	};
}

function codeBlock(): CodeBlock {
	return {
		id: 'block-1',
		type: 'code',
		data: { source: 'export function render() { return "hi"; }' },
	};
}

describe('codeBlockRenderer', () => {
	beforeEach(() => {
		Container.set(
			PageContextFactory,
			mock<PageContextFactory>({ build: () => mock<AppPageContext>() }),
		);
	});

	it("inserts render()'s output as-is (no escaping)", async () => {
		Container.set(
			AppCodeRuntime,
			mock<AppCodeRuntime>({ render: async () => ({ value: '<b>hi</b>', logs: [] }) }),
		);

		const html = await codeBlockRenderer.render(codeBlock(), ctx(false));
		expect(html).toBe('<b>hi</b>');
	});

	it("hands the App's components to the runtime next to the block's static data", async () => {
		const render = vi.fn().mockResolvedValue({ value: '', logs: [] });
		Container.set(AppCodeRuntime, mock<AppCodeRuntime>({ render }));

		const withComponents = ctx(false);
		withComponents.app.components = 'export const Card = () => <div />;';
		await codeBlockRenderer.render(codeBlock(), withComponents);

		const [, , staticData] = render.mock.calls[0];
		expect(staticData.components).toBe('export const Card = () => <div />;');
		expect(staticData.app).not.toHaveProperty('components');
	});

	it('propagates a runtime failure so the page renderer can render the error block', async () => {
		Container.set(
			AppCodeRuntime,
			mock<AppCodeRuntime>({ render: async () => await Promise.reject(new Error('boom')) }),
		);

		await expect(codeBlockRenderer.render(codeBlock(), ctx(false))).rejects.toThrow('boom');
	});

	it('appends ctx.log lines as a trailing comment in preview only', async () => {
		Container.set(
			AppCodeRuntime,
			mock<AppCodeRuntime>({ render: async () => ({ value: 'hi', logs: ['["debug"]'] }) }),
		);

		const previewHtml = await codeBlockRenderer.render(codeBlock(), ctx(true));
		expect(previewHtml).toContain('ctx.log');

		const productionHtml = await codeBlockRenderer.render(codeBlock(), ctx(false));
		expect(productionHtml).toBe('hi');
	});

	it('writes ctx.log lines into the render logs sink under the block id, in preview only', async () => {
		Container.set(
			AppCodeRuntime,
			mock<AppCodeRuntime>({ render: async () => ({ value: 'hi', logs: ['["a"]', '["b"]'] }) }),
		);

		const preview = { ...ctx(true), logs: {} };
		await codeBlockRenderer.render(codeBlock(), preview);
		expect(preview.logs).toEqual({ 'block-1': ['["a"]', '["b"]'] });

		const production = { ...ctx(false), logs: {} };
		await codeBlockRenderer.render(codeBlock(), production);
		expect(production.logs).toEqual({});
	});
});
