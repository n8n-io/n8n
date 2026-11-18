import type { Page, PageOverviewWorkflow } from '@n8n/api-types';

export function createPage(overrides: Partial<Page> = {}): Page {
	return {
		id: 'page-1',
		projectId: 'project-1',
		title: 'Runbook',
		content: 'Hello',
		version: 1,
		createdAt: '2026-11-16T10:00:00.000Z',
		updatedAt: '2026-11-16T10:00:00.000Z',
		...overrides,
	};
}

export function createOverviewWorkflow(
	overrides: Partial<PageOverviewWorkflow> = {},
): PageOverviewWorkflow {
	return {
		id: 'wf-1',
		name: 'Sync orders',
		projectId: 'project-1',
		projectName: 'Sales',
		active: false,
		category: 'webhook',
		nodeTypes: ['n8n-nodes-base.webhook', 'n8n-nodes-base.set'],
		credentialTypes: [],
		pageCount: 0,
		...overrides,
	};
}
