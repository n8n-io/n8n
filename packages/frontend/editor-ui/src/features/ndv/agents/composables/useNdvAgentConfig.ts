import { computed, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue';

import type { INodeUi } from '@/Interface';

import type { AgentCapabilitiesTelemetry } from '@/features/agents/composables/useAgentCapabilitiesActions';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import { readAgentSource, type AgentSourceMode } from '@/features/agents/utils/inlineAgent';

import { useInlineAgentConfig } from './useInlineAgentConfig';
import { useReferencedAgentSummary } from './useReferencedAgentSummary';

/**
 * Mode-switched facade over the AI Agent node's two NDV data sources:
 *
 * - `referenced` — read-only summary of the saved agent the node points at
 *   (`agentSource: 'referenced'`). Edited only in the Agent Builder.
 * - `inline` — editing adapter for the agent definition embedded in the
 *   node's own parameters (`agentSource: 'inline'`).
 *
 * Both are instantiated unconditionally (each idles in the other's mode), so
 * toggling the node's mode switches surfaces without remounting the NDV.
 *
 * MUST be created in the stable NDV container (`NodeDetailsViewV2`), NOT in
 * `NodeSettings`, so it survives node switches. Provide the return via
 * {@link NdvAgentConfigKey}; `NodeSettings` + the NDV agent surfaces inject it.
 * No-ops for non-agent nodes, so it is safe to instantiate for every node.
 */
export function useNdvAgentConfig(
	activeNode: MaybeRefOrGetter<INodeUi | null>,
	options: { telemetry?: AgentCapabilitiesTelemetry } = {},
) {
	// The rich NDV agent experience targets the v2 node only.
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));

	const mode = computed<AgentSourceMode>(() => readAgentSource(toValue(activeNode)));

	const referenced = useReferencedAgentSummary(activeNode);
	const inline = useInlineAgentConfig(activeNode, options);

	// Builder-banner compatibility: in inline mode the banner behaves as "no
	// agent referenced" — its link creates a draft and re-points the node.
	const agentId = computed(() => (mode.value === 'referenced' ? referenced.agentId.value : ''));

	return {
		isAgentNode,
		mode,
		projectId: referenced.projectId,
		agentId,
		openBuilder: referenced.openBuilder,
		referenced,
		inline,
	};
}

export type UseNdvAgentConfigReturn = ReturnType<typeof useNdvAgentConfig>;

/** Provided by `NodeDetailsViewV2`, injected by `NodeSettings` + the NDV agent wrappers. */
export const NdvAgentConfigKey: InjectionKey<UseNdvAgentConfigReturn> = Symbol('NdvAgentConfig');
