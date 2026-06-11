// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { describe, expect, it } from 'vitest';

import { filterSections, matchesTask, useTaskSearch } from './use-task-search';
import type { DesktopAssistantTaskCard, DesktopAssistantTasksResponse } from '../../shared/types';

function card(overrides: Partial<DesktopAssistantTaskCard> = {}): DesktopAssistantTaskCard {
	return {
		workflowId: 'wf-1',
		name: 'Morning news brief',
		description: 'Next Donnerstag, 07:00',
		icon: { type: 'emoji', value: '📰' },
		trigger: { kind: 'manual' },
		source: 'desktop-assistant',
		active: true,
		runsLocally: false,
		...overrides,
	};
}

describe('matchesTask', () => {
	it('matches on the name, case-insensitively', () => {
		expect(matchesTask(card({ name: 'Tidy up my desktop' }), 'TIDY')).toBe(true);
		expect(matchesTask(card({ name: 'Tidy up my desktop' }), 'tidy')).toBe(true);
	});

	it('matches on the description', () => {
		expect(matchesTask(card({ name: 'X', description: 'Save to Dropbox' }), 'dropbox')).toBe(true);
	});

	it('does not match when neither field contains the query', () => {
		expect(matchesTask(card({ name: 'News', description: 'Daily digest' }), 'banana')).toBe(false);
	});

	it('matches everything for an empty or whitespace-only query', () => {
		expect(matchesTask(card(), '')).toBe(true);
		expect(matchesTask(card(), '   ')).toBe(true);
	});
});

describe('filterSections', () => {
	const sections: DesktopAssistantTasksResponse = {
		actionNeeded: [card({ workflowId: 'a', name: 'Slack & Gmail digest' })],
		upcoming: [card({ workflowId: 'u', name: 'Morning news brief' })],
		readyToRun: [
			card({ workflowId: 'r1', name: 'Tidy up my desktop' }),
			card({ workflowId: 'r2', name: 'Hello there' }),
		],
	};

	it('keeps only matching cards in each bucket', () => {
		const result = filterSections(sections, 'desktop');
		expect(result.actionNeeded).toHaveLength(0);
		expect(result.upcoming).toHaveLength(0);
		expect(result.readyToRun.map((c) => c.workflowId)).toEqual(['r1']);
	});

	it('returns every card for a blank query', () => {
		const result = filterSections(sections, '');
		expect(result.actionNeeded).toHaveLength(1);
		expect(result.upcoming).toHaveLength(1);
		expect(result.readyToRun).toHaveLength(2);
	});
});

describe('useTaskSearch', () => {
	it('starts closed with an empty, inactive query', () => {
		const search = useTaskSearch();
		expect(search.open.value).toBe(false);
		expect(search.query.value).toBe('');
		expect(search.isActive.value).toBe(false);
	});

	it('toggles open and closed', () => {
		const search = useTaskSearch();
		search.toggle();
		expect(search.open.value).toBe(true);
		search.toggle();
		expect(search.open.value).toBe(false);
	});

	it('treats a non-blank query as active', () => {
		const search = useTaskSearch();
		search.query.value = 'news';
		expect(search.isActive.value).toBe(true);
		search.query.value = '   ';
		expect(search.isActive.value).toBe(false);
	});

	it('clears the query when closed', () => {
		const search = useTaskSearch();
		search.openSearch();
		search.query.value = 'news';
		search.closeSearch();
		expect(search.open.value).toBe(false);
		expect(search.query.value).toBe('');
	});
});
