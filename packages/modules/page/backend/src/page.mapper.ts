import type { Page, PageListItem, PageNodeReferences, PageSummary } from '@n8n/api-types';

import type { PageEntity } from './page.entity';
import type { PageNodeLinkRow } from './page-reference.repository';
import type { PageListRow, PageSummaryRow } from './page.repository';

export function toPageSummary(row: PageSummaryRow): PageSummary {
	return {
		id: row.id,
		projectId: row.projectId,
		title: row.title,
		version: row.version,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export function toPage(row: PageEntity): Page {
	return { ...toPageSummary(row), content: row.content };
}

export function toPageListItem(row: PageListRow): PageListItem {
	return { ...toPageSummary(row), projectName: row.projectName };
}

/**
 * Groups the pages by the node that they link to, and keeps the order of the pages.
 * A node has no entry when none of its linking pages is in `pages`.
 */
export function toNodeReferences(
	links: PageNodeLinkRow[],
	pages: PageSummary[],
): PageNodeReferences[] {
	const nodeIds = [...new Set(links.map((link) => link.nodeId))];
	const linksPage = (nodeId: string, pageId: string) =>
		links.some((link) => link.nodeId === nodeId && link.pageId === pageId);

	return nodeIds
		.map((nodeId) => ({ nodeId, pages: pages.filter((page) => linksPage(nodeId, page.id)) }))
		.filter((entry) => entry.pages.length > 0);
}
