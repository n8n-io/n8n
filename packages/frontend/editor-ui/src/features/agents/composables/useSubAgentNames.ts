/**
 * Resolves sub-agent ids → friendly names for delegate labels. Wraps the
 * cached/deduped project agents list and loads it lazily — only once the caller
 * signals (via `isNeeded`) that the current content actually contains
 * delegations. Shared by the chat tool step and the session timeline.
 * Uses `AGENT_SUB_AGENT_NAMES_KEY` instead when an ancestor provides it.
 */
import { computed, inject, watch, type Ref } from 'vue';
import { AGENT_SUB_AGENT_NAMES_KEY } from '../components/agentChatInjectionKeys';
import { useProjectAgentsList } from './useProjectAgentsList';

export function useSubAgentNames(projectId: Ref<string>, isNeeded: () => boolean) {
	const provided = inject(AGENT_SUB_AGENT_NAMES_KEY, undefined);
	if (provided) return { subAgentNameById: provided };

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
