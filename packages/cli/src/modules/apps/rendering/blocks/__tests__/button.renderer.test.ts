import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ButtonBlock } from '@n8n/api-types';

import { PageContextFactory } from '../../../runtime/page-context.factory';
import type { AppPageContext, PageContextInput } from '../../../runtime/page-context.factory';
import type { BlockRenderContext } from '../../types';
import { buttonBlockRenderer } from '../button.renderer';

const ctx: BlockRenderContext = {
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
	preview: false,
};

describe('buttonBlockRenderer', () => {
	it('a workflow-target button points its own action ("run") at its own block id', async () => {
		let capturedInput: PageContextInput | undefined;
		Container.set(
			PageContextFactory,
			mock<PageContextFactory>({
				build: (input) => {
					capturedInput = input;
					return mock<AppPageContext>({ actionUrl: (name) => `url:${input.blockId}:${name}` });
				},
			}),
		);

		const block: ButtonBlock = {
			id: 'button-1',
			type: 'button',
			data: { label: 'Run it', style: 'primary', target: { kind: 'workflow', workflowId: 'wf-1' } },
		};

		const html = await buttonBlockRenderer.render(block, ctx);

		expect(capturedInput?.blockId).toBe('button-1');
		expect(html).toContain("action='url:button-1:run'");
		expect(html).toContain('Run it');
	});

	it("an action-target button points at the target block's own action, not itself", async () => {
		let capturedInput: PageContextInput | undefined;
		Container.set(
			PageContextFactory,
			mock<PageContextFactory>({
				build: (input) => {
					capturedInput = input;
					return mock<AppPageContext>({ actionUrl: (name) => `url:${input.blockId}:${name}` });
				},
			}),
		);

		const block: ButtonBlock = {
			id: 'button-1',
			type: 'button',
			data: {
				label: 'Retry',
				style: 'secondary',
				target: { kind: 'action', blockId: 'code-block-1', action: 'retry' },
			},
		};

		const html = await buttonBlockRenderer.render(block, ctx);

		expect(capturedInput?.blockId).toBe('code-block-1');
		expect(html).toContain("action='url:code-block-1:retry'");
	});
});
