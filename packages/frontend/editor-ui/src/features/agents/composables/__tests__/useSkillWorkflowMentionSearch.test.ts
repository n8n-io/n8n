import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	SKILL_WORKFLOW_MENTION_PAGE_SIZE,
	useSkillWorkflowMentionSearch,
} from '../useSkillWorkflowMentionSearch';

const searchWorkflows = vi.hoisted(() => vi.fn());
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows }),
}));

function workflowPage(count: number, offset = 0) {
	return Array.from({ length: count }, (_, index) => ({
		id: `wf${offset + index}`,
		name: `Workflow ${offset + index}`,
	}));
}

describe('useSkillWorkflowMentionSearch', () => {
	beforeEach(() => {
		searchWorkflows.mockReset();
	});

	it('searches the workflows of the project on the server', async () => {
		searchWorkflows.mockResolvedValue(workflowPage(2));
		const { search, workflows, hasMore } = useSkillWorkflowMentionSearch(() => 'project-1');

		await search('  report ');

		expect(searchWorkflows).toHaveBeenCalledWith({
			projectId: 'project-1',
			query: 'report',
			isArchived: false,
			select: ['id', 'name'],
			options: {
				skip: 0,
				take: SKILL_WORKFLOW_MENTION_PAGE_SIZE,
				sortBy: 'updatedAt:desc',
				includeScopes: false,
			},
		});
		expect(workflows.value).toEqual([
			{ workflowId: 'wf0', name: 'Workflow 0' },
			{ workflowId: 'wf1', name: 'Workflow 1' },
		]);
		expect(hasMore.value).toBe(false);
	});

	it('searches all readable workflows when the skill has no project', async () => {
		searchWorkflows.mockResolvedValue([]);
		const { search } = useSkillWorkflowMentionSearch(() => undefined);

		await search('');

		expect(searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: undefined, query: undefined }),
		);
	});

	it('loads the next page after a full page', async () => {
		searchWorkflows
			.mockResolvedValueOnce(workflowPage(SKILL_WORKFLOW_MENTION_PAGE_SIZE))
			.mockResolvedValueOnce(workflowPage(1, SKILL_WORKFLOW_MENTION_PAGE_SIZE));
		const { search, loadMore, workflows, hasMore } = useSkillWorkflowMentionSearch(() => 'p1');

		await search('flow');
		expect(hasMore.value).toBe(true);

		await loadMore();

		expect(searchWorkflows).toHaveBeenLastCalledWith(
			expect.objectContaining({
				query: 'flow',
				options: expect.objectContaining({ skip: SKILL_WORKFLOW_MENTION_PAGE_SIZE }),
			}),
		);
		expect(workflows.value).toHaveLength(SKILL_WORKFLOW_MENTION_PAGE_SIZE + 1);
		expect(hasMore.value).toBe(false);
	});

	it('keeps only the results of the latest search', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		searchWorkflows
			.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce([{ id: 'new', name: 'New' }]);
		const { search, workflows, isLoading } = useSkillWorkflowMentionSearch(() => 'p1');

		const first = search('o');
		await search('ne');
		resolveFirst([{ id: 'old', name: 'Old' }]);
		await first;

		expect(workflows.value).toEqual([{ workflowId: 'new', name: 'New' }]);
		expect(isLoading.value).toBe(false);
	});

	it('shows an error state when the search fails', async () => {
		searchWorkflows.mockRejectedValue(new Error('offline'));
		const { search, workflows, hasError, isLoading } = useSkillWorkflowMentionSearch(() => 'p1');

		await search('');

		expect(workflows.value).toEqual([]);
		expect(hasError.value).toBe(true);
		expect(isLoading.value).toBe(false);
	});
});
