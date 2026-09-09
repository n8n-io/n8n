import type { AppBlock, AppBlockType, AppContent, AppTheme } from '@n8n/api-types';

import type { Viewer } from '../serving/viewer.service';

/** Everything a block renderer may read. Built once per page render. */
export type BlockRenderContext = {
	app: { id: string; name: string; namespace: string; projectId: string; theme: AppTheme | null };
	page: { id: string; route: string; path: string };
	params: Readonly<Record<string, string>>;
	query: Readonly<Record<string, string>>;
	viewer: Viewer | null;
	/** Absolute origin for links and assets, so the same HTML works inside `srcdoc`. */
	baseUrl: string;
	preview: boolean;
};

/** Renders one block to an HTML string. Throwing renders the error block. */
export interface BlockRenderer<T extends AppBlockType = AppBlockType> {
	readonly type: T;
	render(block: Extract<AppBlock, { type: T }>, ctx: BlockRenderContext): Promise<string>;
}

/** A page of the active (published) snapshot, resolved from a public URL. */
export type PublishedPageResolution = {
	app: BlockRenderContext['app'] & { activeVersionId: string };
	page: { id: string; route: string; parentPageId: string | null; content: AppContent | null };
	/** Every page of the snapshot, for the menu. */
	pages: Array<{ id: string; route: string; parentPageId: string | null }>;
	params: Record<string, string>;
};
