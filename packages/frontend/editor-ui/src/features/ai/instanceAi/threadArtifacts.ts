import type { InstanceAiThreadArtifact, InstanceAiThreadArtifactsContext } from '@n8n/api-types';

import type { ResourceEntry } from './useResourceRegistry';

type ThreadArtifactType = InstanceAiThreadArtifact['type'];

/** A tab the user has open in the thread view. */
export type OpenThreadTab = {
	type: ThreadArtifactType;
	id: string;
	name?: string;
	projectId?: string;
	pending?: boolean;
};

const MAX_THREAD_ARTIFACTS = 20;

function isThreadArtifactType(type: ResourceEntry['type']): type is ThreadArtifactType {
	return type === 'workflow' || type === 'agent' || type === 'data-table';
}

function toThreadArtifact(
	tab: OpenThreadTab,
	produced: ResourceEntry | undefined,
): InstanceAiThreadArtifact {
	const name = tab.name ?? produced?.name;
	const projectId = tab.projectId ?? produced?.projectId;
	return {
		type: tab.type,
		id: tab.id,
		...(name ? { name } : {}),
		...(projectId ? { projectId } : {}),
		...(tab.pending || produced?.pending ? { pending: true as const } : {}),
		...(produced?.archived ? { archived: true as const } : {}),
	};
}

/**
 * Build the per-turn index the backend injects inside `<thread-context>`: ids
 * and names only.
 *
 * With `openTabs`, the index is the tabs the user has open, in tab order. An
 * empty list tells the agent no tabs are open. Without it, for a
 * client that has no tab bar, the index is every artifact the thread produced.
 */
export function buildThreadArtifactsContext(
	produced: Iterable<ResourceEntry>,
	activeId?: string,
	openTabs?: OpenThreadTab[],
): InstanceAiThreadArtifactsContext | undefined {
	const producedById = new Map<string, ResourceEntry>();
	const all: InstanceAiThreadArtifact[] = [];
	for (const entry of produced) {
		if (!isThreadArtifactType(entry.type)) continue;
		producedById.set(entry.id, entry);
		if (!openTabs) all.push(toThreadArtifact({ type: entry.type, id: entry.id }, entry));
	}

	if (openTabs) {
		const artifacts = openTabs.map((tab) => toThreadArtifact(tab, producedById.get(tab.id)));
		// Over the cap, keep the first tabs in tab order and never drop the focused one.
		const active = artifacts.find((artifact) => artifact.id === activeId);
		let capped = artifacts.slice(0, MAX_THREAD_ARTIFACTS);
		if (active && !capped.includes(active)) capped = [...capped.slice(0, -1), active];
		return { artifacts: capped, ...(active ? { activeId: active.id } : {}) };
	}

	if (all.length === 0) return undefined;

	// Insertion order is oldest first. Over the cap, keep the newest tabs — the
	// ones the user most likely refers to — and never drop the focused one.
	const active = all.find((artifact) => artifact.id === activeId);
	let artifacts = all.slice(-MAX_THREAD_ARTIFACTS);
	if (active && !artifacts.includes(active)) {
		artifacts = [active, ...artifacts.slice(1)];
	}

	return {
		artifacts,
		...(active ? { activeId: active.id } : {}),
	};
}
