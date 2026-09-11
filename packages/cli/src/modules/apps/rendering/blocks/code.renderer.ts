import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { blockStaticData } from '../block-context';
import type { BlockRenderer } from '../types';

import { AppCodeRuntime } from '../../runtime/app-code-runtime';
import { PageContextFactory } from '../../runtime/page-context.factory';

/**
 * Runs the block's `render(ctx)` in the isolate and inserts the result as-is
 * (`content-blocks.md`: the `code` block is never sanitized). Throwing here —
 * a compile error, a runtime error, an output over the 1 MB cap, a timeout —
 * is intentional: `rendering/page-renderer.ts` catches it, renders the block
 * as nothing and reports the error to the editor (never to visitors).
 */
export const codeBlockRenderer: BlockRenderer<'code'> = {
	type: 'code',
	async render(block, ctx) {
		const staticData = blockStaticData(ctx, block.id);
		const pageContext = Container.get(PageContextFactory).build({ ...staticData, logs: [] });

		const { value: html, logs } = await Container.get(AppCodeRuntime).render(
			block.data.source,
			pageContext,
			staticData,
		);

		if (logs.length === 0) return html;

		Container.get(Logger).debug('App code block log', {
			appId: ctx.app.id,
			pageId: ctx.page.id,
			blockId: block.id,
			logs,
		});

		if (!ctx.preview) return html;
		if (ctx.logs) ctx.logs[block.id] = logs;
		// The trailing comment keeps the log readable in the preview iframe's source.
		const escaped = logs.join('\n').replace(/--/g, '—');
		return `${html}\n<!-- ctx.log:\n${escaped}\n-->`;
	},
};
