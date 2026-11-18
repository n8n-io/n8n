import type { Page } from '@n8n/api-types';

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
