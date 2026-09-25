import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { ArtifactTab } from '../useCanvasPreview';
import { useProjectResourceSearch } from '../composables/useProjectResourceSearch';

const mocks = vi.hoisted(() => ({
	searchWorkflows: vi.fn(),
	fetchDataTablesApi: vi.fn(),
	listAgentsPage: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ searchWorkflows: mocks.searchWorkflows }),
}));

vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	fetchDataTablesApi: mocks.fetchDataTablesApi,
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage: mocks.listAgentsPage,
}));

const PROJECT_ID = 'project-1';

function row(id: string, updatedAt: string) {
	return { id, name: `Name ${id}`, updatedAt };
}

describe('useProjectResourceSearch', () => {
	function setup(options: { projectId?: string; excludedTabs?: ArtifactTab[] } = {}) {
		const excludedTabs = ref(options.excludedTabs ?? []);
		const search = useProjectResourceSearch({
			projectId: () => ('projectId' in options ? options.projectId : PROJECT_ID),
			excludedTabs: () => excludedTabs.value,
		});
		return { ...search, excludedTabs };
	}

	const ids = (tabs: ArtifactTab[]) => tabs.map((tab) => `${tab.type}:${tab.id}`);

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.searchWorkflows.mockResolvedValue([]);
		mocks.fetchDataTablesApi.mockResolvedValue({ count: 0, data: [] });
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });
	});

	it('lists the workflows, data tables and agents of the project, newest edit first', async () => {
		mocks.searchWorkflows.mockResolvedValue([row('wf-1', '2026-09-20T10:00:00.000Z')]);
		mocks.fetchDataTablesApi.mockResolvedValue({
			count: 1,
			data: [row('dt-1', '2026-09-24T10:00:00.000Z')],
		});
		mocks.listAgentsPage.mockResolvedValue({
			count: 1,
			data: [row('agent-1', '2026-09-22T10:00:00.000Z')],
		});
		const { results, search } = setup();

		await search();

		expect(ids(results.value)).toEqual(['data-table:dt-1', 'agent:agent-1', 'workflow:wf-1']);
		expect(results.value[0]).toEqual({
			type: 'data-table',
			id: 'dt-1',
			name: 'Name dt-1',
			icon: 'table',
			projectId: PROJECT_ID,
		});
		expect(mocks.searchWorkflows).toHaveBeenCalledWith({
			projectId: PROJECT_ID,
			query: undefined,
			isArchived: false,
			select: ['id', 'name', 'updatedAt'],
			options: { take: 10, sortBy: 'updatedAt:desc', includeScopes: false },
		});
		expect(mocks.fetchDataTablesApi).toHaveBeenCalledWith(
			{},
			PROJECT_ID,
			{ skip: 0, take: 10 },
			undefined,
			'updatedAt:desc',
		);
		expect(mocks.listAgentsPage).toHaveBeenCalledWith({}, PROJECT_ID, {
			take: 10,
			sortBy: 'updatedAt:desc',
			filter: undefined,
		});
	});

	it('sends the trimmed search text to each request', async () => {
		const { search } = setup();

		await search('  weekly  ');

		expect(mocks.searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({ query: 'weekly' }),
		);
		expect(mocks.fetchDataTablesApi).toHaveBeenCalledWith(
			{},
			PROJECT_ID,
			{ skip: 0, take: 10 },
			{ name: 'weekly' },
			'updatedAt:desc',
		);
		expect(mocks.listAgentsPage).toHaveBeenCalledWith(
			{},
			PROJECT_ID,
			expect.objectContaining({ filter: { query: 'weekly' } }),
		);
	});

	it('hides open tabs and asks for extra rows to replace them', async () => {
		mocks.searchWorkflows.mockResolvedValue([
			row('wf-open', '2026-09-24T10:00:00.000Z'),
			row('wf-1', '2026-09-23T10:00:00.000Z'),
		]);
		const { results, search } = setup({
			excludedTabs: [{ type: 'workflow', id: 'wf-open', name: 'Open', icon: 'workflow' }],
		});

		await search();

		expect(ids(results.value)).toEqual(['workflow:wf-1']);
		expect(mocks.searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({ options: expect.objectContaining({ take: 11 }) }),
		);
		expect(mocks.fetchDataTablesApi).toHaveBeenCalledWith(
			{},
			PROJECT_ID,
			{ skip: 0, take: 10 },
			undefined,
			'updatedAt:desc',
		);
	});

	it('shows at most 10 resources of each type', async () => {
		mocks.searchWorkflows.mockResolvedValue(
			Array.from({ length: 12 }, (_, index) =>
				row(`wf-${index}`, `2026-09-${String(24 - index).padStart(2, '0')}T10:00:00.000Z`),
			),
		);
		const { results, search } = setup();

		await search();

		expect(results.value).toHaveLength(10);
		expect(results.value[9].id).toBe('wf-9');
	});

	it('shows the other types when one request fails', async () => {
		mocks.searchWorkflows.mockRejectedValue(new Error('Forbidden'));
		mocks.listAgentsPage.mockResolvedValue({
			count: 1,
			data: [row('agent-1', '2026-09-22T10:00:00.000Z')],
		});
		const { results, isLoading, search } = setup();

		await search();

		expect(ids(results.value)).toEqual(['agent:agent-1']);
		expect(isLoading.value).toBe(false);
	});

	it('ignores the results of an older search that ends last', async () => {
		let resolveFirst: (rows: unknown[]) => void = () => {};
		mocks.searchWorkflows
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveFirst = resolve;
				}),
			)
			.mockResolvedValueOnce([row('wf-new', '2026-09-24T10:00:00.000Z')]);
		const { results, search } = setup();

		const first = search('old');
		await search('new');
		resolveFirst([row('wf-old', '2026-09-24T10:00:00.000Z')]);
		await first;

		expect(ids(results.value)).toEqual(['workflow:wf-new']);
	});

	it('does not search when the thread has no project', async () => {
		const { results, search } = setup({ projectId: undefined });

		await search();

		expect(results.value).toEqual([]);
		expect(mocks.searchWorkflows).not.toHaveBeenCalled();
		expect(mocks.fetchDataTablesApi).not.toHaveBeenCalled();
		expect(mocks.listAgentsPage).not.toHaveBeenCalled();
	});
});
