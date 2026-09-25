import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { ArtifactTab } from '../useCanvasPreview';
import { useArtifactTabSummaries } from '../useArtifactTabSummaries';

const mocks = vi.hoisted(() => ({
	searchWorkflows: vi.fn(),
	fetchDataTablesApi: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	fetchDataTablesApi: mocks.fetchDataTablesApi,
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		searchWorkflows: mocks.searchWorkflows,
	}),
}));

function workflowTab(id: string, overrides: Partial<ArtifactTab> = {}): ArtifactTab {
	return { id, type: 'workflow', name: `Workflow ${id}`, icon: 'workflow', ...overrides };
}

function dataTableTab(id: string): ArtifactTab {
	return { id, type: 'data-table', name: `Table ${id}`, icon: 'table', projectId: 'project-1' };
}

const UPDATED_AT = '2026-09-24T10:00:00.000Z';

function workflowRow(id: string, activeVersionId: string | null = null) {
	return { id, name: `Workflow ${id}`, updatedAt: UPDATED_AT, activeVersionId };
}

function dataTableRow(id: string, columnCount: number) {
	return {
		id,
		name: `Table ${id}`,
		updatedAt: UPDATED_AT,
		columns: Array.from({ length: columnCount }, (_, index) => ({ id: `col-${index}` })),
	};
}

describe('useArtifactTabSummaries', () => {
	let scope: EffectScope;

	function setup(initialTabs: ArtifactTab[]) {
		const tabs = ref(initialTabs);
		scope = effectScope();
		const result = scope.run(() => useArtifactTabSummaries(() => tabs.value))!;
		return { tabs, ...result };
	}

	beforeEach(() => {
		mocks.searchWorkflows.mockReset();
		mocks.searchWorkflows.mockResolvedValue([]);
		mocks.fetchDataTablesApi.mockReset();
		mocks.fetchDataTablesApi.mockResolvedValue({ count: 0, data: [] });
	});

	afterEach(() => {
		scope?.stop();
	});

	it('loads all workflow tabs in one request with a narrow select', async () => {
		setup([
			workflowTab('wf-1'),
			workflowTab('wf-2'),
			workflowTab('wf-pending', { pending: true }),
			{ id: 'dt-1', type: 'data-table', name: 'Table', icon: 'table' },
		]);
		await flushPromises();

		expect(mocks.searchWorkflows).toHaveBeenCalledTimes(1);
		expect(mocks.searchWorkflows).toHaveBeenCalledWith({
			ids: ['wf-1', 'wf-2'],
			select: ['id', 'name', 'updatedAt', 'activeVersionId'],
			options: { includeScopes: false },
		});
	});

	it('stores the edited time and publish status of each workflow', async () => {
		mocks.searchWorkflows.mockResolvedValue([
			workflowRow('wf-1', 'version-1'),
			workflowRow('wf-2', null),
		]);
		const { getSummary } = setup([workflowTab('wf-1'), workflowTab('wf-2')]);
		await flushPromises();

		expect(getSummary(workflowTab('wf-1'))).toEqual({
			updatedAt: UPDATED_AT,
			type: 'workflow',
			published: true,
		});
		expect(getSummary(workflowTab('wf-2'))).toEqual({
			updatedAt: UPDATED_AT,
			type: 'workflow',
			published: false,
		});
	});

	it('loads only the tabs that are new when the tab list changes', async () => {
		const { tabs } = setup([workflowTab('wf-1')]);
		await flushPromises();
		mocks.searchWorkflows.mockClear();

		tabs.value = [workflowTab('wf-1'), workflowTab('wf-2')];
		await flushPromises();

		expect(mocks.searchWorkflows).toHaveBeenCalledTimes(1);
		expect(mocks.searchWorkflows).toHaveBeenCalledWith(expect.objectContaining({ ids: ['wf-2'] }));
	});

	it('splits the ids into requests of at most 50', async () => {
		const tabs = Array.from({ length: 51 }, (_, index) => workflowTab(`wf-${index}`));
		setup(tabs);
		await flushPromises();

		expect(mocks.searchWorkflows).toHaveBeenCalledTimes(2);
		expect(mocks.searchWorkflows.mock.calls[0][0].ids).toHaveLength(50);
		expect(mocks.searchWorkflows.mock.calls[1][0].ids).toEqual(['wf-50']);
	});

	it('keeps the stored details while a refresh runs', async () => {
		mocks.searchWorkflows.mockResolvedValue([workflowRow('wf-1', 'version-1')]);
		const { getSummary, refresh } = setup([workflowTab('wf-1')]);
		await flushPromises();

		let resolveRefresh: (rows: unknown[]) => void = () => {};
		mocks.searchWorkflows.mockReturnValue(
			new Promise((resolve) => {
				resolveRefresh = resolve;
			}),
		);
		const pendingRefresh = refresh([workflowTab('wf-1')]);

		expect(getSummary(workflowTab('wf-1'))).toEqual(expect.objectContaining({ published: true }));

		resolveRefresh([workflowRow('wf-1', null)]);
		await pendingRefresh;

		expect(getSummary(workflowTab('wf-1'))).toEqual(expect.objectContaining({ published: false }));
	});

	it('marks a workflow that is not in the response as having no details', async () => {
		mocks.searchWorkflows.mockResolvedValue([workflowRow('wf-1')]);
		const { getSummary } = setup([workflowTab('wf-1'), workflowTab('wf-deleted')]);
		await flushPromises();

		expect(getSummary(workflowTab('wf-deleted'))).toBeNull();
	});

	it('keeps stored details and marks unknown workflows when a request fails', async () => {
		mocks.searchWorkflows.mockResolvedValue([workflowRow('wf-1', 'version-1')]);
		const { getSummary, refresh } = setup([workflowTab('wf-1')]);
		await flushPromises();

		mocks.searchWorkflows.mockRejectedValue(new Error('Network error'));
		await refresh([workflowTab('wf-1'), workflowTab('wf-2')]);

		expect(getSummary(workflowTab('wf-1'))).toEqual(expect.objectContaining({ published: true }));
		expect(getSummary(workflowTab('wf-2'))).toBeNull();
	});

	it('reloads a workflow when its build ends', async () => {
		const { tabs } = setup([workflowTab('wf-1', { building: true })]);
		await flushPromises();
		mocks.searchWorkflows.mockClear();

		tabs.value = [workflowTab('wf-1', { building: false })];
		await nextTick();
		await flushPromises();

		expect(mocks.searchWorkflows).toHaveBeenCalledTimes(1);
		expect(mocks.searchWorkflows).toHaveBeenCalledWith(expect.objectContaining({ ids: ['wf-1'] }));
	});

	it('loads all data table tabs in one request to the list of accessible data tables', async () => {
		mocks.fetchDataTablesApi.mockResolvedValue({ count: 1, data: [dataTableRow('dt-1', 3)] });
		const { getSummary } = setup([dataTableTab('dt-1'), dataTableTab('dt-2'), workflowTab('wf-1')]);
		await flushPromises();

		expect(mocks.fetchDataTablesApi).toHaveBeenCalledTimes(1);
		expect(mocks.fetchDataTablesApi).toHaveBeenCalledWith(
			{},
			'',
			{ skip: 0, take: 2 },
			{ id: ['dt-1', 'dt-2'] },
		);
		expect(mocks.searchWorkflows).toHaveBeenCalledWith(expect.objectContaining({ ids: ['wf-1'] }));
		// The count includes the system id column, like the data table cards.
		expect(getSummary(dataTableTab('dt-1'))).toEqual({
			type: 'data-table',
			updatedAt: UPDATED_AT,
			columnCount: 4,
		});
		expect(getSummary(dataTableTab('dt-2'))).toBeNull();
	});

	it('does not load details for agent tabs', async () => {
		const { getSummary } = setup([{ id: 'agent-1', type: 'agent', name: 'Agent', icon: 'robot' }]);
		await flushPromises();

		expect(mocks.searchWorkflows).not.toHaveBeenCalled();
		expect(mocks.fetchDataTablesApi).not.toHaveBeenCalled();
		expect(
			getSummary({ id: 'agent-1', type: 'agent', name: 'Agent', icon: 'robot' }),
		).toBeUndefined();
	});
});
