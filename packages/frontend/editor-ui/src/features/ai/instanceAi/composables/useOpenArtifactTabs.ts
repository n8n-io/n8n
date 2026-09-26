import type {
	InstanceAiThreadTab,
	InstanceAiThreadTabRef,
	InstanceAiThreadTabsState,
} from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import type { ArtifactTab } from '../useCanvasPreview';

/** Loads and saves the open tabs of one thread. */
export interface ThreadTabsStorage {
	load: () => Promise<InstanceAiThreadTabsState | null>;
	save: (state: InstanceAiThreadTabsState) => Promise<void>;
}

export const ARTIFACT_TAB_ICONS: Record<ArtifactTab['type'], IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
	agent: 'robot',
};

// Matches the limits of the stored state schema.
const MAX_CLOSED_TABS = 500;

type TabsLayout = Pick<InstanceAiThreadTabsState, 'tabs' | 'closedTabs'>;

function tabKey(tab: InstanceAiThreadTabRef) {
	return `${tab.type}:${tab.id}`;
}

function toStoredTab(tab: ArtifactTab): InstanceAiThreadTab {
	return {
		type: tab.type,
		id: tab.id,
		name: tab.name,
		...(tab.projectId ? { projectId: tab.projectId } : {}),
	};
}

function fromStoredTab(tab: InstanceAiThreadTab): ArtifactTab {
	return { ...tab, icon: ARTIFACT_TAB_ICONS[tab.type] };
}

/**
 * The tabs a user has open in a thread, on top of the artifacts the thread
 * produced. Until the user changes the tabs, every artifact is open. After
 * that, the stored layout keeps its order and its closed tabs, and artifacts
 * that are new since then open at the end.
 */
export function useOpenArtifactTabs({
	artifactTabs,
	storage,
}: {
	artifactTabs: () => ArtifactTab[];
	storage?: ThreadTabsStorage;
}) {
	// `null` until the user changes the tabs or a stored layout loads.
	const layout = shallowRef<TabsLayout | null>(null);
	const storedActiveTab = ref<InstanceAiThreadTabRef | null>(null);
	const isLoaded = ref(!storage);

	const openTabs = computed((): ArtifactTab[] => {
		const artifacts = artifactTabs();
		const current = layout.value;
		if (!current) return artifacts;

		const artifactsByKey = new Map(artifacts.map((tab) => [tabKey(tab), tab]));
		const closedKeys = new Set(current.closedTabs.map(tabKey));
		const seenKeys = new Set<string>();
		const result: ArtifactTab[] = [];

		for (const tab of current.tabs) {
			const key = tabKey(tab);
			if (seenKeys.has(key)) continue;
			seenKeys.add(key);
			// The live artifact has the current name and build state. A stored tab
			// renders on its own when its artifact is not in the loaded messages.
			result.push(artifactsByKey.get(key) ?? fromStoredTab(tab));
		}
		for (const tab of artifacts) {
			const key = tabKey(tab);
			if (seenKeys.has(key) || closedKeys.has(key)) continue;
			seenKeys.add(key);
			result.push(tab);
		}
		return result;
	});

	function currentLayout(): TabsLayout {
		return layout.value ?? { tabs: openTabs.value.map(toStoredTab), closedTabs: [] };
	}

	function findTab(tabId: string) {
		return (
			openTabs.value.find((tab) => tab.id === tabId) ??
			artifactTabs().find((tab) => tab.id === tabId)
		);
	}

	/**
	 * Close a tab. Returns the id of the tab to show instead: the next tab, or
	 * the previous one when the closed tab was the last.
	 */
	function closeTab(tabId: string): string | undefined {
		const tabs = openTabs.value;
		const index = tabs.findIndex((tab) => tab.id === tabId);
		if (index === -1) return undefined;

		const closed = tabs[index];
		const closedKey = tabKey(closed);
		const { closedTabs } = currentLayout();
		layout.value = {
			tabs: tabs.filter((_, i) => i !== index).map(toStoredTab),
			closedTabs: [
				...closedTabs.filter((tab) => tabKey(tab) !== closedKey),
				{ type: closed.type, id: closed.id },
			].slice(-MAX_CLOSED_TABS),
		};
		return (tabs[index + 1] ?? tabs[index - 1])?.id;
	}

	/** Open a closed artifact again. Returns true when the tabs changed. */
	function reopenTab(tabId: string): boolean {
		const current = layout.value;
		if (!current) return false;
		const tab = findTab(tabId);
		if (!tab) return false;

		const key = tabKey(tab);
		const isClosed = current.closedTabs.some((closed) => tabKey(closed) === key);
		const isOpen = current.tabs.some((open) => tabKey(open) === key);
		if (!isClosed && isOpen) return false;

		layout.value = {
			tabs: isOpen ? current.tabs : [...current.tabs, toStoredTab(tab)],
			closedTabs: current.closedTabs.filter((closed) => tabKey(closed) !== key),
		};
		return true;
	}

	// --- Storage ---

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingActiveTabId: string | undefined;

	function buildState(activeTabId: string | undefined): InstanceAiThreadTabsState {
		const tabs = openTabs.value;
		const active = tabs.find((tab) => tab.id === activeTabId);
		return {
			tabs: tabs.map(toStoredTab),
			closedTabs: currentLayout().closedTabs,
			activeTab: active ? { type: active.type, id: active.id } : null,
		};
	}

	function flushSave() {
		if (saveTimer === undefined) return;
		clearTimeout(saveTimer);
		saveTimer = undefined;
		// A failed save keeps the tabs on screen; the next change saves them again.
		void storage?.save(buildState(pendingActiveTabId)).catch(() => {});
	}

	/**
	 * Save the tabs after a short delay. Saving starts to store a layout for the
	 * thread, so call it only for changes the user makes.
	 */
	function saveTabs(activeTabId: string | undefined) {
		if (!storage) return;
		layout.value ??= currentLayout();
		pendingActiveTabId = activeTabId;
		if (saveTimer !== undefined) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			// A change before the stored layout loads would overwrite it.
			if (!isLoaded.value) return;
			flushSave();
		}, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));
	}

	async function loadTabs() {
		if (!storage) return;
		try {
			const state = await storage.load();
			// A change the user made while the request ran wins over the stored layout.
			if (state && !layout.value) {
				layout.value = { tabs: state.tabs, closedTabs: state.closedTabs };
				storedActiveTab.value = state.activeTab;
			}
		} catch {
			// Show the default tabs when the stored layout cannot load.
		} finally {
			isLoaded.value = true;
			if (saveTimer !== undefined) flushSave();
		}
	}

	void loadTabs();

	// Save a pending change before the thread view goes away.
	onScopeDispose(() => {
		if (isLoaded.value) flushSave();
	});

	return {
		openTabs,
		isLoaded,
		storedActiveTab,
		closeTab,
		reopenTab,
		saveTabs,
	};
}
