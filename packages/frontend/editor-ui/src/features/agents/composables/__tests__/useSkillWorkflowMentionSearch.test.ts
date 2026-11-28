import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	SKILL_WORKFLOW_MENTION_PAGE_SIZE,
	useSkillWorkflowMentionSearch,
} from '@/features/agents/composables/useSkillWorkflowMentionSearch';

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
			excludePersonalProjectsOfOthers: undefined,
			query: 'report',
			isArchived: false,
			select: ['id', 'name', 'updatedAt'],
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

	it('selects the column that it sorts by, so the server can page the workflows of a team project', async () => {
		searchWorkflows.mockResolvedValue([]);
		const { search } = useSkillWorkflowMentionSearch(() => 'team-project');

		await search('');

		const [{ select, options }] = searchWorkflows.mock.calls[0];
		expect(select).toContain(options.sortBy.split(':')[0]);
	});

	it('searches readable workflows outside the personal projects of others when the skill has no project', async () => {
		searchWorkflows.mockResolvedValue([]);
		const { search } = useSkillWorkflowMentionSearch(() => undefined);

		await search('');

		expect(searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId: undefined,
				excludePersonalProjectsOfOthers: true,
				query: undefined,
			}),
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

	it('keeps the show more option when a next page fails', async () => {
		searchWorkflows
			.mockResolvedValueOnce(workflowPage(SKILL_WORKFLOW_MENTION_PAGE_SIZE))
			.mockRejectedValueOnce(new Error('offline'));
		const { search, loadMore, workflows, hasMore, hasError } = useSkillWorkflowMentionSearch(
			() => 'p1',
		);
		await search('');

		await loadMore();

		expect(workflows.value).toHaveLength(SKILL_WORKFLOW_MENTION_PAGE_SIZE);
		expect(hasMore.value).toBe(true);
		expect(hasError.value).toBe(true);
	});

	it('drops the old results and ignores a running request when a new search starts', async () => {
		let resolveRunning: (value: unknown) => void = () => {};
		searchWorkflows
			.mockResolvedValueOnce([{ id: 'old', name: 'Old' }])
			.mockReturnValueOnce(new Promise((resolve) => (resolveRunning = resolve)));
		const { search, loadMore, startNewSearch, workflows, isLoading } =
			useSkillWorkflowMentionSearch(() => 'p1');
		await search('');
		const running = loadMore();

		startNewSearch();
		resolveRunning([{ id: 'late', name: 'Late' }]);
		await running;

		expect(workflows.value).toEqual([]);
		expect(isLoading.value).toBe(true);
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
