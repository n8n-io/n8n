import {
	computed,
	inject,
	onBeforeUnmount,
	ref,
	toValue,
	watch,
	type InjectionKey,
	type MaybeRefOrGetter,
} from 'vue';
import { deepCopy } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useToast } from '@/app/composables/useToast';
import type { INodeUi } from '@/Interface';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { agentsEventBus } from '@/features/agents/agents.eventBus';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useAgentConfigAutosave } from '@/features/agents/composables/useAgentConfigAutosave';
import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import {
	useAgentCapabilitiesActions,
	type AgentCapabilitiesTelemetry,
} from '@/features/agents/composables/useAgentCapabilitiesActions';
import type { AgentJsonConfig, AgentResource } from '@/features/agents/types';

interface ConfigSnapshot {
	projectId: string;
	agentId: string;
	config: AgentJsonConfig;
}

/**
 * Orchestrates reading + autosaving the *shared agent primitive* referenced by
 * the AI Agent node, for use inside the NDV. A miniature of `AgentBuilderView`'s
 * config lifecycle — it reuses the same `useAgentConfig` + `useAgentConfigAutosave`
 * machinery and the extracted `useAgentCapabilitiesActions`.
 *
 * MUST be created in the stable NDV container (`NodeDetailsViewV2`), NOT in
 * `NodeSettings`: the container survives node switches and its `close()` /
 * node-switch paths are where `flush()` / `settle()` are awaited. Provide the
 * return via {@link NdvAgentConfigKey}; `NodeSettings` injects it.
 *
 * No-ops for non-agent nodes (guarded by `isAgentNode`), so it is safe to
 * instantiate unconditionally for every node the NDV opens.
 */
export function useNdvAgentConfig(
	activeNode: MaybeRefOrGetter<INodeUi | null>,
	options: { telemetry?: AgentCapabilitiesTelemetry } = {},
) {
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const toast = useToast();
	const i18n = useI18n();
	// Non-strict inject: the workflow document store is provided in the NDV tree,
	// but falling back to `null` keeps the composable unit-testable in isolation.
	const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

	const isAgentNode = computed(() => toValue(activeNode)?.type === MESSAGE_AN_AGENT_NODE_TYPE);

	// Scope to the workflow's owning project, matching how the agent picker
	// resolved the project when the agent was referenced (see
	// AgentSelectorParameterInput) so we read/write the same agent record.
	// `currentProjectId` can drift on cross-route navigation; the 404 → terminal
	// handling in `load`/`saveConfig` covers that edge.
	const projectId = computed(
		() =>
			projectsStore.currentProjectId ??
			workflowDocumentStore?.value?.homeProject?.id ??
			projectsStore.personalProject?.id ??
			'',
	);

	const agentId = computed(() => {
		if (!isAgentNode.value) return '';
		const param = toValue(activeNode)?.parameters?.agentId;
		if (param && typeof param === 'object' && 'value' in param) {
			const { value } = param as { value?: unknown };
			if (typeof value === 'string') return value;
		}
		return '';
	});

	const { canUpdate } = useAgentPermissions(projectId);

	const { config, loading, fetchConfig, updateConfig } = useAgentConfig();
	const localConfig = ref<AgentJsonConfig | null>(null);
	const agent = ref<AgentResource | null>(null);
	const connectedTriggers = ref<string[]>([]);
	/** Bumped after a task/skill modal change so the capabilities section reloads. */
	const tasksReloadKey = ref(0);
	const loadError = ref<unknown | null>(null);
	/** Terminal state: the referenced agent was deleted or access was lost. */
	const isUnavailable = ref(false);

	const isPublished = computed(() => Boolean(agent.value?.activeVersionId));

	function isPermanentError(error: unknown): boolean {
		const status =
			(error as { httpStatusCode?: number })?.httpStatusCode ??
			(error as { response?: { status?: number } })?.response?.status;
		return status === 404 || status === 403;
	}

	async function fetchAgent(pId: string, aId: string) {
		agent.value = await getAgent(rootStore.restApiContext, pId, aId);
	}

	async function load(pId: string, aId: string) {
		loadError.value = null;
		isUnavailable.value = false;
		try {
			// Credentials for the agent's project are already loaded by the workflow
			// editor (the agent lives in the workflow's project), so the in-modal
			// tool/credential pickers work without a redundant fetch here.
			await Promise.all([fetchConfig(pId, aId), fetchAgent(pId, aId)]);
		} catch (error) {
			if (isPermanentError(error)) isUnavailable.value = true;
			loadError.value = error;
		}
	}

	async function saveConfig(snapshot: ConfigSnapshot) {
		try {
			const result = await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config);
			// Drop the response if the active node switched agents mid-flight.
			if (result.stale) return;
			if (agent.value && agent.value.id === snapshot.agentId && result.versionId !== undefined) {
				agent.value = { ...agent.value, versionId: result.versionId };
			}
			await fetchAgent(snapshot.projectId, snapshot.agentId);
		} catch (error) {
			if (isPermanentError(error)) isUnavailable.value = true;
			throw error;
		}
	}

	const autosave = useAgentConfigAutosave<ConfigSnapshot>({
		save: saveConfig,
		onError: (error: unknown) => {
			// Keep `localConfig` so the next successful autosave persists the edit.
			toast.showError(error, i18n.baseText('agents.builder.saveError'));
		},
	});

	/** The host config-update funnel handed to the capability actions + panels. */
	function scheduleConfigUpdate(updates: Partial<AgentJsonConfig>) {
		if (!localConfig.value || !canUpdate.value || isUnavailable.value) return;
		Object.assign(localConfig.value, updates);
		autosave.scheduleAutosave({
			projectId: projectId.value,
			agentId: agentId.value,
			config: deepCopy(localConfig.value),
		});
	}

	const caps = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId,
		agentId,
		connectedTriggers,
		scheduleConfigUpdate,
		telemetry: options.telemetry,
	});

	// Working copy tracks the fetched config.
	watch(config, (fresh) => {
		localConfig.value = fresh ? deepCopy(fresh) : null;
	});

	// (Re)load when the referenced agent changes (node switch, or an in-NDV agent
	// swap). FLUSH — not settle — the previous agent's pending save first, so a
	// sub-debounce edit isn't dropped. The snapshot is self-addressed to the
	// previous agent, so a late-landing save targets the right record; `useAgentConfig`
	// drops its stale local write. Covers node-switch without touching the shared
	// container's switch handler.
	watch(
		agentId,
		async (id, previous) => {
			if (id === previous) return;
			if (previous) await autosave.flushAutosave().catch(() => {});
			if (id && isAgentNode.value) {
				await load(projectId.value, id);
			} else {
				localConfig.value = null;
				agent.value = null;
				connectedTriggers.value = [];
			}
		},
		{ immediate: true },
	);

	// Cross-surface: another surface (the Agent Builder) wrote the same agent —
	// refetch so our view doesn't silently diverge. Last-write-wins otherwise
	// (a true fix needs a backend version precondition; out of scope for v1).
	function onAgentUpdated() {
		if (agentId.value) void load(projectId.value, agentId.value);
	}
	agentsEventBus.on('agentUpdated', onAgentUpdated);
	onBeforeUnmount(() => agentsEventBus.off('agentUpdated', onAgentUpdated));

	/**
	 * Refresh after a task/skill modal change (mirrors the builder's
	 * `onConfigUpdated`): refetch config + agent and bump the reload key so the
	 * capabilities section re-pulls task bodies.
	 */
	async function onConfigUpdated() {
		if (!agentId.value) return;
		await load(projectId.value, agentId.value);
		tasksReloadKey.value += 1;
	}

	return {
		isAgentNode,
		projectId,
		agentId,
		canUpdate,
		localConfig,
		agent,
		connectedTriggers,
		tasksReloadKey,
		loading,
		loadError,
		isUnavailable,
		isPublished,
		saveStatus: autosave.saveStatus,
		appliedSkills: caps.appliedSkills,
		actions: caps,
		scheduleConfigUpdate,
		onConfigUpdated,
		reload: async () => {
			if (agentId.value) await load(projectId.value, agentId.value);
		},
		flush: autosave.flushAutosave,
		settle: autosave.settleAutosave,
	};
}

export type UseNdvAgentConfigReturn = ReturnType<typeof useNdvAgentConfig>;

/** Provided by `NodeDetailsViewV2`, injected by `NodeSettings` + the NDV agent wrappers. */
export const NdvAgentConfigKey: InjectionKey<UseNdvAgentConfigReturn> = Symbol('NdvAgentConfig');
