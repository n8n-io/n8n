import type { AppBlock, AppBlockType, AppContent, AppLayout, AppTheme } from '@n8n/api-types';

import type { MenuItem } from '../serving/page-menu';
import type { ResolvedLayout } from '../serving/resolve-layout';
import type { Viewer } from '../serving/viewer.service';

/** `ctx.log` lines per block id, collected in preview renders only. */
export type RenderLogs = Record<string, string[]>;

/** Everything a block renderer may read. Built once per page render. */
export type BlockRenderContext = {
	app: {
		id: string;
		name: string;
		namespace: string;
		projectId: string;
		theme: AppTheme | null;
		components: string | null;
	};
	page: { id: string; route: string; path: string };
	/**
	 * The page whose `content` or `layout` holds the block being rendered, so an
	 * action URL of an inherited layout block points at the page that owns it.
	 */
	actionPageId: string;
	params: Readonly<Record<string, string>>;
	query: Readonly<Record<string, string>>;
	viewer: Viewer | null;
	menu: MenuItem[];
	/** Absolute origin for links and assets, so the same HTML works inside `srcdoc`. */
	baseUrl: string;
	preview: boolean;
	/** Sink a renderer writes its block's log lines into; absent outside page renders. */
	logs?: RenderLogs;
};

/** Renders one block to an HTML string. Throwing renders nothing and reports the error. */
export interface BlockRenderer<T extends AppBlockType = AppBlockType> {
	readonly type: T;
	render(block: Extract<AppBlock, { type: T }>, ctx: BlockRenderContext): Promise<string>;
}

/** A page resolved from a public URL: of the active snapshot, or of the draft rows for a `draft` token. */
export type PageResolution = {
	app: BlockRenderContext['app'];
	page: {
		id: string;
		route: string;
		title: string | null;
		parentPageId: string | null;
		content: AppContent | null;
		layout: AppLayout | null;
	};
	/** Every page of the same tree, for the menu. */
	pages: Array<{ id: string; route: string; title: string | null; parentPageId: string | null }>;
	params: Record<string, string>;
	layout: ResolvedLayout | null;
	preview: boolean;
};
