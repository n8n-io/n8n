import type { AppVersionSnapshot } from '@n8n/api-types';
import { appContentSchema, appLayoutSchema } from '@n8n/api-types';

import type { Page } from '../page.entity';

export type SnapshotPages = AppVersionSnapshot['pages'];

/**
 * The draft rows of an App in the snapshot's shape, so the preview, the draft
 * serving path and draft actions all read the same page tree. An invalid draft
 * column counts as empty: the rest of the page still renders.
 */
export const toDraftPages = (pages: Page[]): SnapshotPages =>
	pages.map((page) => ({
		id: page.id,
		route: page.route,
		title: page.title,
		parentPageId: page.parentPageId,
		content: appContentSchema.safeParse(page.content).data ?? null,
		layout: appLayoutSchema.safeParse(page.layout).data ?? null,
	}));
