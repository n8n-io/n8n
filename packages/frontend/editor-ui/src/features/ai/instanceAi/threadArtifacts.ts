import type { InstanceAiThreadArtifact, InstanceAiThreadArtifactsContext } from '@n8n/api-types';

import type { ResourceEntry } from './useResourceRegistry';

type ThreadArtifactType = InstanceAiThreadArtifact['type'];

const MAX_THREAD_ARTIFACTS = 20;

function isThreadArtifactType(type: ResourceEntry['type']): type is ThreadArtifactType {
	return type === 'workflow' || type === 'agent' || type === 'data-table';
}

/**
 * Build the per-turn index the backend injects inside `<thread-context>`.
 * Matches the thread preview tabs: ids and names only.
 */
export function buildThreadArtifactsContext(
	produced: Iterable<ResourceEntry>,
	activeId?: string,
): InstanceAiThreadArtifactsContext | undefined {
	const all: InstanceAiThreadArtifact[] = [];
	for (const entry of produced) {
		if (!isThreadArtifactType(entry.type)) continue;
		all.push({
			type: entry.type,
			id: entry.id,
			...(entry.name ? { name: entry.name } : {}),
			...(entry.projectId ? { projectId: entry.projectId } : {}),
			...(entry.pending ? { pending: true as const } : {}),
			...(entry.archived ? { archived: true as const } : {}),
		});
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
