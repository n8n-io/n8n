import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { deepCopy, type INodeParameters } from 'n8n-workflow';
import type { AgentSkill } from '@n8n/api-types';

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
	generateInlineSkillId,
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
	'skills',
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
 * The parameter value as the editor writes it: `config` keeps the broad
 * `AgentJsonConfig` type the shared panels emit; execution-time validation
 * against `InlineAgentConfigSchema` is what narrows it to the inline subset.
 */
interface InlineAgentParameterValue {
	config: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
}

/**
 * Keep only skill bodies whose id is still referenced by the config — the
 * write-time mirror of the backend's `removeUnreferencedSkills`. Removing a
 * skill ref therefore GCs its body in the same parameter write. The `skills`
 * key is omitted entirely when empty so params without skills stay
 * byte-identical to their pre-skills shape.
 */
function withPrunedSkillBodies(
	config: AgentJsonConfig,
	bodies: Record<string, AgentSkill>,
): InlineAgentParameterValue {
	const refIds = new Set((config.skills ?? []).map((ref) => ref.id));
	const kept = Object.fromEntries(Object.entries(bodies).filter(([id]) => refIds.has(id)));
	return {
		config,
		...(Object.keys(kept).length > 0 ? { skills: kept } : {}),
	};
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

	/** Skill bodies from the node parameter — the inline stand-in for `agent.skills`. */
	const skillBodies = computed<Record<string, AgentSkill>>(() => inlineAgent.value?.skills ?? {});

	/**
	 * Host identity for the capability modals' confirm guards: a late confirm
	 * must not write onto a different node the user switched to meanwhile.
	 */
	const hostId = computed(() => {
		const node = toValue(activeNode);
		return node && isAgentNode.value ? `inline:${node.id}` : '';
	});

	// Eager, not debounced: writes are local node-parameter edits (workflow
	// persistence has its own debounce), and a deferred write could fire after
	// a node switch and land on the wrong node. Body + ref changes must share
	// one emit — two sequential read-modify-write emits can lose the first.
	function writeInlineAgent(node: INodeUi, value: InlineAgentParameterValue) {
		ndvEventBus.emit('updateParameterValue', {
			name: `parameters.${INLINE_AGENT_PARAMETER_NAME}`,
			value: value as unknown as INodeParameters,
			// Address the write to this node explicitly so a modal confirm landing
			// after a node switch still targets the node it was opened for.
			node: node.name,
		});
	}

	/** Write the merged definition to the node parameter (standard pipeline). */
	function scheduleConfigUpdate(updates: Partial<AgentJsonConfig>) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;

		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		const nextConfig: AgentJsonConfig = pickInlineConfigKeys({
			...deepCopy(current.config),
			...deepCopy(pickInlineConfigKeys(updates)),
		});

		writeInlineAgent(node, withPrunedSkillBodies(nextConfig, deepCopy(current.skills ?? {})));
	}

	/** Mint an id and land the body + its config ref in one parameter write. */
	function createInlineSkill(skill: AgentSkill) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;

		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		const skillId = generateInlineSkillId(Object.keys(current.skills ?? {}));
		const nextConfig: AgentJsonConfig = pickInlineConfigKeys({
			...deepCopy(current.config),
			skills: [...(current.config.skills ?? []), { type: 'skill' as const, id: skillId }],
		});

		writeInlineAgent(
			node,
			withPrunedSkillBodies(nextConfig, {
				...deepCopy(current.skills ?? {}),
				[skillId]: deepCopy(skill),
			}),
		);
	}

	/** Body-only update; the ref is unchanged so the config carries over as-is. */
	function updateInlineSkill(skillId: string, skill: AgentSkill) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;

		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		if (!(current.config.skills ?? []).some((ref) => ref.id === skillId)) return;

		writeInlineAgent(
			node,
			withPrunedSkillBodies(pickInlineConfigKeys(deepCopy(current.config)), {
				...deepCopy(current.skills ?? {}),
				[skillId]: deepCopy(skill),
			}),
		);
	}

	// Inline agents carry no custom tools, so the actions' agent-resource
	// reads all fall back gracefully on null. Skill bodies come from the
	// `localSkills` seam below instead of an entity.
	const agent = ref<AgentResource | null>(null);
	const connectedTriggers = ref<string[]>([]);

	const caps = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId,
		agentId: hostId,
		connectedTriggers,
		scheduleConfigUpdate,
		// Unused: with `localSkills` present, skill persistence goes through the
		// seam's single-emit callbacks, never this entity-autosave hook.
		scheduleSkillSave: () => {},
		localSkills: {
			bodies: skillBodies,
			createSkill: createInlineSkill,
			updateSkill: updateInlineSkill,
		},
		// Approval suspends the run for a human; workflow executions don't
		// support suspend/resume, so the config modals hide the toggle.
		supportsToolApproval: false,
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
