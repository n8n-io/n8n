import type { InstanceAiThreadArtifact, InstanceAiThreadArtifactsContext } from '@n8n/api-types';

import type { ResourceEntry } from './useResourceRegistry';

const THREAD_ARTIFACT_TYPES = new Set<ResourceEntry['type']>(['workflow', 'agent', 'data-table']);
const MAX_THREAD_ARTIFACTS = 20;

/**
 * Build the per-turn index the backend injects inside `<thread-context>`.
 * Matches the thread preview tabs: ids and names only.
 */
export function buildThreadArtifactsContext(
	produced: Iterable<ResourceEntry>,
	activeId?: string,
): InstanceAiThreadArtifactsContext | undefined {
	const artifacts: InstanceAiThreadArtifact[] = [];
	for (const entry of produced) {
		if (!THREAD_ARTIFACT_TYPES.has(entry.type)) continue;
		artifacts.push({
			type: entry.type,
			id: entry.id,
			...(entry.name ? { name: entry.name } : {}),
			...(entry.projectId ? { projectId: entry.projectId } : {}),
			...(entry.pending ? { pending: true as const } : {}),
			...(entry.archived ? { archived: true as const } : {}),
		});
		if (artifacts.length >= MAX_THREAD_ARTIFACTS) break;
	}
	if (artifacts.length === 0) return undefined;

	return {
		artifacts,
		...(activeId !== undefined && artifacts.some((artifact) => artifact.id === activeId)
			? { activeId }
			: {}),
	};
}
