import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import { DEBOUNCE_TIME } from '@/app/constants';
import { useOpenArtifactTabs, type ThreadTabsStorage } from '../composables/useOpenArtifactTabs';
import type { ArtifactTab } from '../useCanvasPreview';

const SAVE_DELAY = DEBOUNCE_TIME.API.AUTOSAVE;

function workflowTab(id: string, name = `Workflow ${id}`): ArtifactTab {
	return { id, type: 'workflow', name, icon: 'workflow' };
}

function dataTableTab(id: string): ArtifactTab {
	return { id, type: 'data-table', name: `Table ${id}`, icon: 'table', projectId: 'project-1' };
}

function createStorage(state: InstanceAiThreadTabsState | null = null) {
	let resolveLoad: (value: InstanceAiThreadTabsState | null) => void = () => {};
	const load = vi.fn(
		async () =>
			await new Promise<InstanceAiThreadTabsState | null>((resolve) => {
				resolveLoad = resolve;
			}),
	);
	const save = vi.fn(async (_state: InstanceAiThreadTabsState) => {});
	const storage: ThreadTabsStorage = { load, save };
	return {
		storage,
		load,
		save,
		finishLoad: async (value: InstanceAiThreadTabsState | null = state) => {
			resolveLoad(value);
			await flushPromises();
		},
	};
}

describe('useOpenArtifactTabs', () => {
	let scope: EffectScope;

	function setup(initialArtifacts: ArtifactTab[], storage?: ThreadTabsStorage) {
		const artifacts = ref(initialArtifacts);
		scope = effectScope();
		const tabs = scope.run(() =>
			useOpenArtifactTabs({ artifactTabs: () => artifacts.value, storage }),
		)!;
		return { artifacts, tabs };
	}

	const ids = (tabs: ArtifactTab[]) => tabs.map((tab) => tab.id);

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		scope?.stop();
		vi.useRealTimers();
	});

	it('opens every artifact when no layout is stored', () => {
		const { tabs } = setup([workflowTab('wf-1'), dataTableTab('dt-1')]);

		expect(ids(tabs.openTabs.value)).toEqual(['wf-1', 'dt-1']);
	});

	it('keeps a closed tab closed after the thread loads again', async () => {
		const first = createStorage();
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], first.storage);
		await first.finishLoad(null);

		tabs.closeTab('wf-1');
		tabs.saveTabs('wf-2');
		await vi.advanceTimersByTimeAsync(SAVE_DELAY);

		expect(ids(tabs.openTabs.value)).toEqual(['wf-2']);
		const savedState = first.save.mock.calls[0][0];
		scope.stop();

		const second = createStorage(savedState);
		const reloaded = setup([workflowTab('wf-1'), workflowTab('wf-2')], second.storage);
		await second.finishLoad();

		expect(ids(reloaded.tabs.openTabs.value)).toEqual(['wf-2']);
	});

	it('keeps the stored order and opens new artifacts at the end', async () => {
		const { storage, finishLoad } = createStorage({
			tabs: [workflowTab('wf-2'), workflowTab('wf-1')].map(({ icon: _icon, ...tab }) => tab),
			closedTabs: [],
			activeTab: null,
		});
		const { tabs } = setup(
			[workflowTab('wf-1'), workflowTab('wf-2'), workflowTab('wf-3')],
			storage,
		);
		await finishLoad();

		expect(ids(tabs.openTabs.value)).toEqual(['wf-2', 'wf-1', 'wf-3']);
	});

	it('shows a stored tab whose artifact is not in the loaded messages', async () => {
		const { storage, finishLoad } = createStorage({
			tabs: [{ type: 'data-table', id: 'dt-old', name: 'Old table', projectId: 'project-1' }],
			closedTabs: [],
			activeTab: null,
		});
		const { tabs } = setup([workflowTab('wf-1')], storage);
		await finishLoad();

		expect(tabs.openTabs.value).toEqual([
			{
				type: 'data-table',
				id: 'dt-old',
				name: 'Old table',
				projectId: 'project-1',
				icon: 'table',
			},
			workflowTab('wf-1'),
		]);
	});

	it('uses the current artifact name instead of the stored one', async () => {
		const { storage, finishLoad } = createStorage({
			tabs: [{ type: 'workflow', id: 'wf-1', name: 'Old name' }],
			closedTabs: [],
			activeTab: null,
		});
		const { tabs } = setup([workflowTab('wf-1', 'New name')], storage);
		await finishLoad();

		expect(tabs.openTabs.value[0].name).toBe('New name');
	});

	it('returns the next tab when a tab closes, or the previous tab for the last one', () => {
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2'), workflowTab('wf-3')]);

		expect(tabs.closeTab('wf-2')).toBe('wf-3');
		expect(tabs.closeTab('wf-3')).toBe('wf-1');
		expect(tabs.closeTab('wf-1')).toBeUndefined();
		expect(tabs.openTabs.value).toEqual([]);
	});

	it('opens a closed artifact again', () => {
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')]);
		tabs.closeTab('wf-1');

		expect(tabs.reopenTab('wf-1')).toBe(true);
		expect(ids(tabs.openTabs.value)).toEqual(['wf-2', 'wf-1']);
		expect(tabs.reopenTab('wf-1')).toBe(false);
	});

	it('opens a picked resource at the end and removes it from the closed tabs', () => {
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')]);
		tabs.closeTab('wf-2');

		tabs.openTab(dataTableTab('dt-1'));
		tabs.openTab(workflowTab('wf-2'));

		expect(ids(tabs.openTabs.value)).toEqual(['wf-1', 'dt-1', 'wf-2']);
		expect(tabs.openTabs.value[1]).toEqual(dataTableTab('dt-1'));
	});

	it('keeps the place of a picked resource that is open already', () => {
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')]);

		tabs.openTab(workflowTab('wf-1'));

		expect(ids(tabs.openTabs.value)).toEqual(['wf-1', 'wf-2']);
	});

	it('waits for the save delay and sends one save for many changes', async () => {
		const { storage, save, finishLoad } = createStorage();
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], storage);
		await finishLoad(null);

		tabs.saveTabs('wf-1');
		tabs.saveTabs('wf-2');
		await vi.advanceTimersByTimeAsync(SAVE_DELAY - 1);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith({
			tabs: [
				{ type: 'workflow', id: 'wf-1', name: 'Workflow wf-1' },
				{ type: 'workflow', id: 'wf-2', name: 'Workflow wf-2' },
			],
			closedTabs: [],
			activeTab: { type: 'workflow', id: 'wf-2' },
		});
	});

	it('does not save before the stored layout loads, and saves once it has loaded', async () => {
		const { storage, save, finishLoad } = createStorage();
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], storage);

		tabs.closeTab('wf-1');
		tabs.saveTabs('wf-2');
		await vi.advanceTimersByTimeAsync(SAVE_DELAY);
		expect(save).not.toHaveBeenCalled();

		await finishLoad(null);

		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({ closedTabs: [{ type: 'workflow', id: 'wf-1' }] }),
		);
	});

	it('keeps a change made while the stored layout loads', async () => {
		const { storage, finishLoad } = createStorage({
			tabs: [{ type: 'workflow', id: 'wf-2', name: 'Workflow wf-2' }],
			closedTabs: [{ type: 'workflow', id: 'wf-1' }],
			activeTab: null,
		});
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], storage);

		tabs.closeTab('wf-2');
		await finishLoad();

		expect(ids(tabs.openTabs.value)).toEqual(['wf-1']);
	});

	it('saves a pending change when the scope is disposed', async () => {
		const { storage, save, finishLoad } = createStorage();
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], storage);
		await finishLoad(null);

		tabs.closeTab('wf-1');
		tabs.saveTabs('wf-2');
		scope.stop();

		expect(save).toHaveBeenCalledTimes(1);
	});

	it('opens every artifact when the stored layout cannot load', async () => {
		const load = vi.fn().mockRejectedValue(new Error('Network error'));
		const save = vi.fn().mockResolvedValue(undefined);
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], { load, save });
		await flushPromises();

		expect(tabs.isLoaded.value).toBe(true);
		expect(ids(tabs.openTabs.value)).toEqual(['wf-1', 'wf-2']);
	});

	it('exposes the stored active tab once the layout loads', async () => {
		const { storage, finishLoad } = createStorage({
			tabs: [
				{ type: 'workflow', id: 'wf-1', name: 'Workflow wf-1' },
				{ type: 'workflow', id: 'wf-2', name: 'Workflow wf-2' },
			],
			closedTabs: [],
			activeTab: { type: 'workflow', id: 'wf-2' },
		});
		const { tabs } = setup([workflowTab('wf-1'), workflowTab('wf-2')], storage);
		expect(tabs.isLoaded.value).toBe(false);

		await finishLoad();

		expect(tabs.isLoaded.value).toBe(true);
		expect(tabs.storedActiveTab.value).toEqual({ type: 'workflow', id: 'wf-2' });
	});
});
