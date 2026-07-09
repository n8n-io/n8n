import {
	computed,
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

import { useToast } from '@/app/composables/useToast';
import type { INodeUi } from '@/Interface';

import { agentsEventBus, type AgentUpdatedEvent } from '@/features/agents/agents.eventBus';
import { isAgentNodeV2 } from '@/features/agents/utils/agentNode';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { getAgent, updateAgentSkill } from '@/features/agents/composables/useAgentApi';
import { useAgentConfig } from '@/features/agents/composables/useAgentConfig';
import { useAgentConfigAutosave } from '@/features/agents/composables/useAgentConfigAutosave';
import { useAgentNavigation } from '@/features/agents/composables/useAgentNavigation';
import {
	useAgentCapabilitiesActions,
	type AgentCapabilitiesTelemetry,
} from '@/features/agents/composables/useAgentCapabilitiesActions';
import type { AgentJsonConfig, AgentResource, AgentSkill } from '@/features/agents/types';

interface ConfigSnapshot {
	projectId: string;
	agentId: string;
	config: AgentJsonConfig;
}

interface SkillSnapshot {
	projectId: string;
	agentId: string;
	skillId: string;
	skill: AgentSkill;
}

// Distinguishes each orchestrator instance's own `agentUpdated` emissions from
// other surfaces', so its listener doesn't reload (and clobber in-flight local
// edits) in response to its own writes.
let instanceSeq = 0;

/**
 * Orchestrates reading + autosaving the *shared agent primitive* referenced by
 * the AI Agent node, for use inside the NDV. A miniature of `AgentBuilderView`'s
 * config lifecycle — it reuses the same `useAgentConfig` + `useAgentConfigAutosave`
 * machinery and the extracted `useAgentCapabilitiesActions`.
 *
 * MUST be created in the stable NDV container (`NodeDetailsViewV2`), NOT in
 * `NodeSettings`: the container survives node switches and its `close()` /
 * node-switch paths are where `flush()` is awaited. Provide the return via
 * {@link NdvAgentConfigKey}; `NodeSettings` injects it.
 *
 * No-ops for non-agent nodes (guarded by `isAgentNode`), so it is safe to
 * instantiate unconditionally for every node the NDV opens.
 */
export function useNdvAgentConfig(
	activeNode: MaybeRefOrGetter<INodeUi | null>,
	options: { telemetry?: AgentCapabilitiesTelemetry } = {},
) {
	const rootStore = useRootStore();
	const nav = useAgentNavigation();
	const toast = useToast();
	const i18n = useI18n();

	// The rich NDV agent experience targets the v2 node only.
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));

	const eventSource = `ndv-agent-config-${++instanceSeq}`;

	/** Notify other surfaces (canvas cards, other listeners) that the agent was written. */
	function emitAgentUpdated(forAgentId: string) {
		agentsEventBus.emit('agentUpdated', { agentId: forAgentId, source: eventSource });
	}

	const projectId = useAgentScopeProjectId();

	const agentId = computed(() => {
		if (!isAgentNode.value) return '';
		const param = toValue(activeNode)?.parameters?.agentId;
		if (param && typeof param === 'object' && 'value' in param) {
			const { value } = param as { value?: unknown };
			if (typeof value === 'string') return value;
		}
		return '';
	});

	// Agent editing inside the NDV is hidden until polished: render the
	// referenced agent read-only regardless of the user's agent:update scope.
	// Restore `useAgentPermissions(projectId).canUpdate` to re-enable.
	const canUpdate = computed(() => false);

	const { config, loading, repoint, fetchConfig, updateConfig } = useAgentConfig();
	const localConfig = ref<AgentJsonConfig | null>(null);
	const agent = ref<AgentResource | null>(null);
	const connectedTriggers = ref<string[]>([]);
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
			// Credentials for the agent's project are already loaded by the workflow
			// editor (the agent lives in the workflow's project), so the in-modal
			// tool/credential pickers work without a redundant fetch here.
			await Promise.all([fetchConfig(pId, aId), fetchAgent(pId, aId)]);
		} catch (error) {
			// A stale load's failure must not mark the *current* agent unavailable.
			if (agentId.value !== aId || projectId.value !== pId) return;
			if (isPermanentError(error)) isUnavailable.value = true;
			loadError.value = error;
		}
	}

	async function saveConfig(snapshot: ConfigSnapshot) {
		try {
			const result = await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config);
			// The write landed regardless of staleness below — tell other surfaces.
			emitAgentUpdated(snapshot.agentId);

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

	async function saveSkill(snapshot: SkillSnapshot) {
		let result;
		try {
			result = await updateAgentSkill(
				rootStore.restApiContext,
				snapshot.projectId,
				snapshot.agentId,
				snapshot.skillId,
				snapshot.skill,
			);
		} catch (error) {
			// Mirror saveConfig: a permanent failure is terminal, but only when the
			// snapshot targets the current agent (self-addressed snapshots can
			// outlive a switch).
			if (isPermanentError(error) && snapshot.agentId === agentId.value) {
				isUnavailable.value = true;
			}
			throw error;
		}

		emitAgentUpdated(snapshot.agentId);

		if (agent.value?.id !== snapshot.agentId) return;

		agent.value = {
			...agent.value,
			versionId: result.versionId,
			skills: {
				...(agent.value.skills ?? {}),
				[snapshot.skillId]: result.skill,
			},
		};
	}

	// Skill-body edits persist on their own autosave, mirroring the builder — so
	// the capability actions' skill-save seam has a flushable funnel here too.
	const skillAutosave = useAgentConfigAutosave<SkillSnapshot>({
		save: saveSkill,
		onError: (error: unknown) => {
			toast.showError(error, i18n.baseText('agents.builder.skills.saveError'));
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

	/** Skill-save seam handed to the capability actions (edit-existing-skill path). */
	function scheduleSkillSave(payload: { skillId: string; skill: AgentSkill }) {
		if (!canUpdate.value || isUnavailable.value) return;

		skillAutosave.scheduleAutosave({
			projectId: projectId.value,
			agentId: agentId.value,
			skillId: payload.skillId,
			skill: payload.skill,
		});
	}

	// Both funnels are flushed/settled together (mirrors the builder) so a pending
	// skill save can't outlive an NDV close or a node/agent switch.
	async function flush() {
		await Promise.all([autosave.flushAutosave(), skillAutosave.flushAutosave()]);
	}

	async function settle() {
		await Promise.all([autosave.settleAutosave(), skillAutosave.settleAutosave()]);
	}

	const saveStatus = computed(() => {
		if (autosave.saveStatus.value === 'saving' || skillAutosave.saveStatus.value === 'saving') {
			return 'saving';
		}

		if (autosave.saveStatus.value === 'saved' || skillAutosave.saveStatus.value === 'saved') {
			return 'saved';
		}

		return 'idle';
	});

	const caps = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId,
		agentId,
		connectedTriggers,
		scheduleConfigUpdate,
		scheduleSkillSave,
		telemetry: options.telemetry,
	});

	// Working copy tracks the fetched config.
	watch(config, (fresh) => {
		localConfig.value = fresh ? deepCopy(fresh) : null;
	});

	// (Re)load when the referenced agent OR the project scope changes (node
	// switch, in-NDV agent swap, or `projectId` resolving late / drifting).
	// FLUSH — not settle — the previous scope's pending save first, so a
	// sub-debounce edit isn't dropped. The snapshot is self-addressed to the
	// previous project/agent, so a late-landing save targets the right record;
	// `useAgentConfig` drops its stale local write. Covers node-switch without
	// touching the shared container's switch handler.
	watch(
		[agentId, projectId] as const,
		async ([id, pId], previous) => {
			const [previousId] = previous ?? [];
			// Drop the previous working copy synchronously, BEFORE the async load:
			// keeping it would leave the old agent's config on screen and editable
			// while the new agent's fetch is in flight, and an edit in that window
			// would autosave the old agent's content onto the new one.
			if (previous) {
				localConfig.value = null;
				agent.value = null;
				connectedTriggers.value = [];
				// Repoint the shared config key BEFORE flushing, so the flushed
				// save for the previous agent resolves as stale — otherwise its
				// response would repopulate `localConfig` (via the config watcher)
				// with the old agent's data, reopening the window just closed.
				repoint(pId, id);
			}

			if (previousId) await flush().catch(() => {});

			if (id && pId && isAgentNode.value) {
				await load(pId, id);
			}
			// `id && !pId`: project scope not resolved yet — skip the load instead
			// of latching a 404 terminal state; the watcher refires once it resolves.
		},
		{ immediate: true },
	);

	// Cross-surface: another surface (the Agent Builder) wrote the same agent —
	// refetch so our view doesn't silently diverge. Last-write-wins otherwise.
	// Our own emissions are skipped.
	function onAgentUpdated(event?: AgentUpdatedEvent) {
		if (event?.source === eventSource) return;
		if (event?.agentId && event.agentId !== agentId.value) return;
		if (!agentId.value) return;
		void (async () => {
			// Persist pending local edits before reloading: the reload replaces
			// `localConfig` with server state, and a still-queued whole-config
			// snapshot firing afterwards would clobber the other surface's write
			// with the pre-reload copy.
			await flush().catch(() => {});
			await load(projectId.value, agentId.value);
		})();
	}

	agentsEventBus.on('agentUpdated', onAgentUpdated);
	onBeforeUnmount(() => agentsEventBus.off('agentUpdated', onAgentUpdated));

	/**
	 * Refresh after a capability modal change (mirrors the builder's
	 * `onConfigUpdated`): refetch config + agent so the capabilities section
	 * re-pulls skill bodies. Modal flows (e.g. skill creation) write through
	 * their own API calls, not `saveConfig`, so notify other surfaces here.
	 */
	async function onConfigUpdated() {
		if (!agentId.value) return;

		emitAgentUpdated(agentId.value);
		await load(projectId.value, agentId.value);
	}

	/**
	 * Open the referenced agent in the Agent Builder, remembering this node as the
	 * origin so the builder shows a "Back to workflow" banner (same round-trip the
	 * canvas card's open affordance uses).
	 */
	async function openBuilder() {
		if (!agentId.value) return;
		// Persist pending debounced edits first: the builder fetches the config on
		// mount, and an unflushed save landing after that fetch would be clobbered
		// by the builder's next whole-config autosave.
		await flush().catch(() => {});
		await nav.openBuilder(projectId.value, agentId.value, toValue(activeNode)?.id);
	}

	return {
		openBuilder,
		isAgentNode,
		projectId,
		agentId,
		canUpdate,
		localConfig,
		agent,
		connectedTriggers,
		loading,
		loadError,
		isUnavailable,
		isPublished,
		saveStatus,
		appliedSkills: caps.appliedSkills,
		actions: caps,
		scheduleConfigUpdate,
		onConfigUpdated,
		reload: async () => {
			if (agentId.value) await load(projectId.value, agentId.value);
		},
		flush,
		settle,
	};
}

export type UseNdvAgentConfigReturn = ReturnType<typeof useNdvAgentConfig>;

/** Provided by `NodeDetailsViewV2`, injected by `NodeSettings` + the NDV agent wrappers. */
export const NdvAgentConfigKey: InjectionKey<UseNdvAgentConfigReturn> = Symbol('NdvAgentConfig');
