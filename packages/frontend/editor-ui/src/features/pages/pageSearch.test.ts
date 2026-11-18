import type { PageSummary } from '@n8n/api-types';

import { filterPagesByTitle } from './pageSearch';

const toPage = (id: string, title: string): PageSummary => ({
	id,
	title,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-01T00:00:00.000Z',
});

const pages = [toPage('1', 'Runbook'), toPage('2', 'Onboarding'), toPage('3', 'Order runbook')];

describe('filterPagesByTitle', () => {
	it('should keep every page for an empty search', () => {
		expect(filterPagesByTitle(pages, '  ')).toEqual(pages);
	});

	it('should match a part of the title without case', () => {
		expect(filterPagesByTitle(pages, ' RUNB ').map(({ id }) => id)).toEqual(['1', '3']);
	});

	it('should keep no page when no title matches', () => {
		expect(filterPagesByTitle(pages, 'invoice')).toEqual([]);
	});
});
