/**
 * Resolves sub-agent ids → friendly names for delegate labels. Wraps the
 * cached/deduped project agents list and loads it lazily — only once the caller
 * signals (via `isNeeded`) that the current content actually contains
 * delegations. Shared by the chat tool step and the session timeline.
 */
import { computed, watch, type Ref } from 'vue';
import { useProjectAgentsList } from './useProjectAgentsList';

export function useSubAgentNames(projectId: Ref<string>, isNeeded: () => boolean) {
	const { list, ensureLoaded } = useProjectAgentsList(projectId);

	const subAgentNameById = computed(() => {
		const map = new Map<string, string>();
		for (const agent of list.value ?? []) map.set(agent.id, agent.name);
		return map;
	});

	watch(
		[isNeeded, projectId],
		([needed, id]) => {
			if (needed && id) void ensureLoaded().catch(() => {});
		},
		{ immediate: true },
	);

	return { subAgentNameById };
}
