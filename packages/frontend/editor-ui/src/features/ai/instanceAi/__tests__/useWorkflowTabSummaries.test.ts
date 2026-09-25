import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { ArtifactTab } from '../useCanvasPreview';
import { useWorkflowTabSummaries } from '../useWorkflowTabSummaries';

const mocks = vi.hoisted(() => ({
	searchWorkflows: vi.fn(),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		searchWorkflows: mocks.searchWorkflows,
	}),
}));

function workflowTab(id: string, overrides: Partial<ArtifactTab> = {}): ArtifactTab {
	return { id, type: 'workflow', name: `Workflow ${id}`, icon: 'workflow', ...overrides };
}

const UPDATED_AT = '2026-09-24T10:00:00.000Z';

function workflowRow(id: string, activeVersionId: string | null = null) {
	return { id, name: `Workflow ${id}`, updatedAt: UPDATED_AT, activeVersionId };
}

describe('useWorkflowTabSummaries', () => {
	let scope: EffectScope;

	function setup(initialTabs: ArtifactTab[]) {
		const tabs = ref(initialTabs);
		scope = effectScope();
		const result = scope.run(() => useWorkflowTabSummaries(() => tabs.value))!;
		return { tabs, ...result };
	}

	beforeEach(() => {
		mocks.searchWorkflows.mockReset();
		mocks.searchWorkflows.mockResolvedValue([]);
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
		const { summaries } = setup([workflowTab('wf-1'), workflowTab('wf-2')]);
		await flushPromises();

		expect(summaries.get('wf-1')).toEqual({
			updatedAt: UPDATED_AT,
			published: true,
		});
		expect(summaries.get('wf-2')).toEqual({
			updatedAt: UPDATED_AT,
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
		const { summaries, refresh } = setup([workflowTab('wf-1')]);
		await flushPromises();

		let resolveRefresh: (rows: unknown[]) => void = () => {};
		mocks.searchWorkflows.mockReturnValue(
			new Promise((resolve) => {
				resolveRefresh = resolve;
			}),
		);
		const pendingRefresh = refresh(['wf-1']);

		expect(summaries.get('wf-1')).toEqual(expect.objectContaining({ published: true }));

		resolveRefresh([workflowRow('wf-1', null)]);
		await pendingRefresh;

		expect(summaries.get('wf-1')).toEqual(expect.objectContaining({ published: false }));
	});

	it('marks a workflow that is not in the response as having no details', async () => {
		mocks.searchWorkflows.mockResolvedValue([workflowRow('wf-1')]);
		const { summaries } = setup([workflowTab('wf-1'), workflowTab('wf-deleted')]);
		await flushPromises();

		expect(summaries.get('wf-deleted')).toBeNull();
	});

	it('keeps stored details and marks unknown workflows when a request fails', async () => {
		mocks.searchWorkflows.mockResolvedValue([workflowRow('wf-1', 'version-1')]);
		const { summaries, refresh } = setup([workflowTab('wf-1')]);
		await flushPromises();

		mocks.searchWorkflows.mockRejectedValue(new Error('Network error'));
		await refresh(['wf-1', 'wf-2']);

		expect(summaries.get('wf-1')).toEqual(expect.objectContaining({ published: true }));
		expect(summaries.get('wf-2')).toBeNull();
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
});
