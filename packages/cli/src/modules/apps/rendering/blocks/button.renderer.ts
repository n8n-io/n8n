import { Container } from '@n8n/di';

import { renderPartial } from '../templates';
import type { BlockRenderer } from '../types';

import { PageContextFactory } from '../../runtime/page-context.factory';

export const buttonBlockRenderer: BlockRenderer<'button'> = {
	type: 'button',
	async render(block, ctx) {
		const { target } = block.data;
		// A `workflow` button is its own handler (`run`); an `action` button forwards
		// to the target code block's action — the button block itself never handles it.
		const { blockId, actionName } =
			target.kind === 'workflow'
				? { blockId: block.id, actionName: 'run' }
				: { blockId: target.blockId, actionName: target.action };

		const pageContext = Container.get(PageContextFactory).build({
			app: ctx.app,
			page: ctx.page,
			blockId,
			params: ctx.params,
			query: ctx.query,
			viewer: ctx.viewer,
			baseUrl: ctx.baseUrl,
			logs: [],
		});

		return await renderPartial('block-button', {
			label: block.data.label,
			isSecondary: block.data.style === 'secondary',
			actionUrl: pageContext.actionUrl(actionName),
		});
	},
};
