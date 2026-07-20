import { computed, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { INodeUi } from '@/Interface';

import { agentsEventBus, type AgentUpdatedEvent } from '@/features/agents/agents.eventBus';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import { readAgentSource } from '@/features/agents/utils/inlineAgent';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useAgentNavigation } from '@/features/agents/composables/useAgentNavigation';
import type { AgentResource, AgentSkill } from '@/features/agents/types';

/**
 * Read-only view of the *saved agent* referenced by the AI Agent node, for the
 * NDV's summary section. Fetches the config + agent record and keeps them
 * fresh across node switches and cross-surface writes (Agent Builder edits) —
 * but never writes anything itself: the shared agent is edited only in the
 * builder.
 */
export function useReferencedAgentSummary(activeNode: MaybeRefOrGetter<INodeUi | null>) {
	const rootStore = useRootStore();
	const nav = useAgentNavigation();

	// The rich NDV agent experience targets the v2 node only.
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));

	const projectId = useAgentScopeProjectId();

	const agentId = computed(() => {
		if (!isAgentNode.value) return '';
		const node = toValue(activeNode);
		// Inline mode idles the loader; a leftover agentId param (retained so
		// mode toggling is non-destructive) must not keep fetching.
		if (readAgentSource(node) === 'inline') return '';
		const param = node?.parameters?.agentId;
		if (param && typeof param === 'object' && 'value' in param) {
			const { value } = param as { value?: unknown };
			if (typeof value === 'string') return value;
		}
		return '';
	});

	const { config, loading, repoint, fetchConfig } = useAgentConfig();
	const agent = ref<AgentResource | null>(null);
	const loadError = ref<unknown | null>(null);
	/** Terminal state: the referenced agent was deleted or access was lost. */
	const isUnavailable = ref(false);

	const isPublished = computed(() => Boolean(agent.value?.activeVersionId));

	/** Skill refs resolved against the agent record's skill bodies (for display). */
	const appliedSkills = computed<Array<{ id: string; skill: AgentSkill }>>(() => {
		const refs = config.value?.skills ?? [];
		const seen = new Set<string>();
		const out: Array<{ id: string; skill: AgentSkill }> = [];

		for (const skillRef of refs) {
			if (!skillRef.id || seen.has(skillRef.id)) continue;
			seen.add(skillRef.id);
			out.push({
				id: skillRef.id,
				skill: agent.value?.skills?.[skillRef.id] ?? {
					name: skillRef.id,
					description: '',
					instructions: '',
				},
			});
		}

		return out;
	});

	function isPermanentError(error: unknown): boolean {
		const status =
			(error as { httpStatusCode?: number })?.httpStatusCode ??
			(error as { response?: { status?: number } })?.response?.status;
		return status === 404 || status === 403;
	}

	async function fetchAgent(pId: string, aId: string) {
		const fresh = await getAgent(rootStore.restApiContext, pId, aId);
		// Concurrent loads can race (node switch fires a new load while the
		// previous one is in flight); `fetchConfig` drops stale resolutions
		// internally, so guard the agent record the same way.
		if (agentId.value === aId && projectId.value === pId) agent.value = fresh;
	}

	async function load(pId: string, aId: string) {
		loadError.value = null;
		isUnavailable.value = false;
		try {
			await Promise.all([fetchConfig(pId, aId), fetchAgent(pId, aId)]);
		} catch (error) {
			// A stale load's failure must not mark the *current* agent unavailable.
			if (agentId.value !== aId || projectId.value !== pId) return;
			if (isPermanentError(error)) isUnavailable.value = true;
			loadError.value = error;
		}
	}

	// (Re)load when the referenced agent OR the project scope changes (node
	// switch, in-NDV agent swap, or `projectId` resolving late / drifting).
	watch(
		[agentId, projectId] as const,
		async ([id, pId], previous) => {
			// Drop the previous record synchronously so the old agent's summary
			// doesn't linger while the new agent's fetch is in flight.
			if (previous) {
				agent.value = null;
				repoint(pId, id);
			}

			if (id && pId && isAgentNode.value) {
				await load(pId, id);
			}
			// `id && !pId`: project scope not resolved yet — skip the load instead
			// of latching a 404 terminal state; the watcher refires once it resolves.
		},
		{ immediate: true },
	);

	// Cross-surface: another surface (the Agent Builder) wrote the same agent —
	// refetch so this read-only view doesn't silently go stale.
	function onAgentUpdated(event?: AgentUpdatedEvent) {
		if (event?.agentId && event.agentId !== agentId.value) return;
		if (!agentId.value) return;
		void load(projectId.value, agentId.value);
	}

	agentsEventBus.on('agentUpdated', onAgentUpdated);
	onBeforeUnmount(() => agentsEventBus.off('agentUpdated', onAgentUpdated));

	/**
	 * Open the referenced agent in the Agent Builder, remembering this node as the
	 * origin so the builder shows a "Back to workflow" banner (same round-trip the
	 * canvas card's open affordance uses).
	 */
	async function openBuilder() {
		if (!agentId.value) return;
		await nav.openBuilder(projectId.value, agentId.value, toValue(activeNode)?.id);
	}

	return {
		isAgentNode,
		projectId,
		agentId,
		config,
		agent,
		appliedSkills,
		loading,
		loadError,
		isUnavailable,
		isPublished,
		openBuilder,
		reload: async () => {
			if (agentId.value) await load(projectId.value, agentId.value);
		},
	};
}

export type UseReferencedAgentSummaryReturn = ReturnType<typeof useReferencedAgentSummary>;
