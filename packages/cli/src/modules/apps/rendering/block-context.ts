import type { RunStaticData } from '../runtime/app-code-runtime';
import type { BlockRenderContext } from './types';

/** The slice of the render context one block hands to `PageContextFactory` and the isolate. */
export const blockStaticData = (ctx: BlockRenderContext, blockId: string): RunStaticData => {
	const { components, ...app } = ctx.app;
	return {
		app,
		components,
		page: ctx.page,
		actionPageId: ctx.actionPageId,
		blockId,
		params: ctx.params,
		query: ctx.query,
		viewer: ctx.viewer,
		menu: ctx.menu,
		baseUrl: ctx.baseUrl,
	};
};
