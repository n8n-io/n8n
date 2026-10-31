import {
	MAX_ASSISTANT_THREAD_CLOSED_TABS,
	MAX_ASSISTANT_THREAD_OPEN_TABS,
	type AssistantThreadTab,
	type AssistantThreadTabRef,
	type AssistantThreadTabsState,
} from '@n8n/api-types';
import type { InstanceAiChangedArtifact } from '@n8n/instance-ai';

/** Thread metadata key with the tabs that the owner of an Assistant agent thread has open. */
export const ASSISTANT_TABS_METADATA_KEY = 'assistantTabs';

function isSameTab(a: AssistantThreadTabRef, b: AssistantThreadTabRef) {
	return a.type === b.type && a.id === b.id;
}

/**
 * The stored tabs with `tab` shown, as during a live run: removed from the
 * closed tabs, added at the end when it is not open yet, active, and with the
 * preview open. Returns `null` when nothing changes.
 */
export function withShownTab(
	stored: AssistantThreadTabsState | null,
	tab: InstanceAiChangedArtifact,
): AssistantThreadTabsState | null {
	const existing = stored?.tabs.find((open) => isSameTab(open, tab));
	// The tab renders this name until the thread's messages load. The ID is the last fallback.
	const name = (tab.name ?? existing?.name ?? tab.id).slice(0, 255);
	const projectId = tab.projectId ?? existing?.projectId;
	const merged: AssistantThreadTab = {
		type: tab.type,
		id: tab.id,
		name,
		...(projectId ? { projectId } : {}),
	};
	const activeTab = { type: tab.type, id: tab.id };
	if (stored === null) {
		return { tabs: [merged], closedTabs: [], activeTab, previewOpen: true };
	}

	const isClosed = stored.closedTabs.some((closed) => isSameTab(closed, tab));
	const isShown =
		stored.activeTab !== null && isSameTab(stored.activeTab, tab) && stored.previewOpen === true;
	if (
		!isClosed &&
		isShown &&
		existing?.name === merged.name &&
		existing.projectId === merged.projectId
	) {
		return null;
	}

	const tabs = existing
		? stored.tabs.map((open) => (isSameTab(open, tab) ? merged : open))
		: [...stored.tabs, merged];
	let closedTabs = stored.closedTabs.filter((closed) => !isSameTab(closed, tab));

	// Close the leftmost tabs over the limit, because a state over it fails to save.
	while (tabs.length > MAX_ASSISTANT_THREAD_OPEN_TABS) {
		const index = tabs.findIndex((open) => !isSameTab(open, tab));
		const [dropped] = tabs.splice(index, 1);
		closedTabs = [
			...closedTabs.filter((closed) => !isSameTab(closed, dropped)),
			{ type: dropped.type, id: dropped.id },
		];
	}

	return {
		tabs,
		closedTabs: closedTabs.slice(-MAX_ASSISTANT_THREAD_CLOSED_TABS),
		activeTab,
		previewOpen: true,
	};
}
