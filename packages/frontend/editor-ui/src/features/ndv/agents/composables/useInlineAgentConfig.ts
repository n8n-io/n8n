import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { deepCopy, type INodeParameters } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import {
	useAgentCapabilitiesActions,
	type AgentCapabilitiesTelemetry,
} from '@/features/agents/composables/useAgentCapabilitiesActions';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import {
	createDefaultInlineAgent,
	INLINE_AGENT_PARAMETER_NAME,
	readAgentSource,
	readInlineAgentParameter,
} from '@/features/agents/utils/inlineAgent';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';

/**
 * The keys an inline agent may define — mirrors `InlineAgentJsonConfigSchema`
 * (strict on the backend). The shared panels can emit out-of-scope keys (e.g.
 * model changes normalize `config.webSearch`/`providerTools`); persisting them
 * would make the node fail validation at execution time.
 */
const INLINE_CONFIG_KEYS = [
	'name',
	'model',
	'credential',
	'instructions',
	'tools',
	'mcpServers',
] as const satisfies ReadonlyArray<keyof AgentJsonConfig>;

function pickInlineConfigKeys<T extends Partial<AgentJsonConfig>>(source: T): T {
	const picked: Partial<AgentJsonConfig> = {};
	for (const key of INLINE_CONFIG_KEYS) {
		if (key in source && source[key] !== undefined) {
			(picked as Record<string, unknown>)[key] = source[key];
		}
	}
	return picked as T;
}

/**
 * Editing adapter for an *inline* agent — the definition embedded in the
 * MessageAnAgent node's hidden `inlineAgent` parameter. Unlike the referenced
 * orchestrator there is no fetching and no autosave: reads come straight from
 * the node's parameters, and writes ride the standard parameter pipeline
 * (`ndvEventBus` → `NodeSettings.valueChanged`), which gives workflow dirty
 * state, save-with-workflow, versioning, and duplication/export fidelity.
 */
export function useInlineAgentConfig(
	activeNode: MaybeRefOrGetter<INodeUi | null>,
	options: { telemetry?: AgentCapabilitiesTelemetry } = {},
) {
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));

	const projectId = useAgentScopeProjectId();

	/**
	 * The effective inline definition: the stored parameter, or a display-only
	 * default while the parameter is still empty. The default is NOT written
	 * back on read — only the first real edit persists it — so merely opening
	 * an inline-mode node never dirties the workflow.
	 */
	const inlineAgent = computed(() => {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return null;
		if (readAgentSource(node) !== 'inline') return null;
		return readInlineAgentParameter(node) ?? createDefaultInlineAgent();
	});

	const localConfig = computed<AgentJsonConfig | null>(() => inlineAgent.value?.config ?? null);

	/**
	 * Host identity for the capability modals' confirm guards: a late confirm
	 * must not write onto a different node the user switched to meanwhile.
	 */
	const hostId = computed(() => {
		const node = toValue(activeNode);
		return node && isAgentNode.value ? `inline:${node.id}` : '';
	});

	/** Write the merged definition to the node parameter (standard pipeline). */
	function scheduleConfigUpdate(updates: Partial<AgentJsonConfig>) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;

		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		const nextConfig: AgentJsonConfig = pickInlineConfigKeys({
			...deepCopy(current.config),
			...deepCopy(pickInlineConfigKeys(updates)),
		});

		ndvEventBus.emit('updateParameterValue', {
			name: `parameters.${INLINE_AGENT_PARAMETER_NAME}`,
			value: { config: nextConfig } as unknown as INodeParameters,
			// Address the write to this node explicitly so a modal confirm landing
			// after a node switch still targets the node it was opened for.
			node: node.name,
		});
	}

	// Inline agents carry no skill bodies and no custom tools, so the actions'
	// agent-resource reads all fall back gracefully on null.
	const agent = ref<AgentResource | null>(null);
	const connectedTriggers = ref<string[]>([]);

	const caps = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId,
		agentId: hostId,
		connectedTriggers,
		scheduleConfigUpdate,
		// Skills are out of inline scope (the capabilities section is rendered
		// without its skills section), so the skill-save seam never fires.
		scheduleSkillSave: () => {},
		telemetry: options.telemetry,
	});

	return {
		isAgentNode,
		projectId,
		hostId,
		localConfig,
		scheduleConfigUpdate,
		actions: caps,
	};
}

export type UseInlineAgentConfigReturn = ReturnType<typeof useInlineAgentConfig>;
