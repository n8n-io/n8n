import { useToast } from '@n8n/composables/useToast';
import { AGENT_BUILDER_VIEW } from '@n8n/frontend-constants/agents';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import { useActiveTaskBoard } from '../../composables/useActiveTaskBoard';
import { useProjectResourcePermissions } from '../../composables/useProjectResourcePermissions';
import {
	addTaskBoardAgent,
	createAgent,
	fetchAgent,
	fetchAgentConfig,
	publishAgent,
	updateAgentConfig,
} from '../../task-board.api';
import type {
	AgentFormValues,
	TaskBoardAgentDetail,
	TaskBoardAgentOption,
	TeamAgent,
} from '../../task-board.types';
import { applyFormValues, emptyConfig, toFormValues, toTeamAgent } from './team.utils';

/**
 * The team of the board on screen: the members of its project and the agents of the board.
 * Each agent is a normal agent of the agents module, and a new agent joins this board only.
 * Saving an agent also publishes it, because the board dispatcher runs the published
 * version only.
 */
export function useTaskBoardTeam() {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();
	const i18n = useI18n();
	const { permissionsFor } = useProjectResourcePermissions();
	const { boardRef, assignees: members, refreshBoard } = useActiveTaskBoard();
	const projectId = computed(() => boardRef().projectId || undefined);

	const details = ref<TaskBoardAgentDetail[]>([]);
	const loadingAgents = ref(false);
	const saving = ref(false);
	const publishingId = ref<string | null>(null);
	/** Why the last publish from this page failed, by agent id. */
	const publishErrors = ref<Record<string, string>>({});

	const agentsEnabled = computed(() => settingsStore.isAgentsEnabled);
	const agents = computed<TeamAgent[]>(() =>
		details.value.map((detail) => toTeamAgent(detail, publishErrors.value[detail.id] ?? null)),
	);

	const agentPermissions = computed(() => permissionsFor(projectId.value)?.agent);
	const canAddAgent = computed(
		() => agentsEnabled.value && agentPermissions.value?.create === true,
	);
	const canEditAgent = computed(
		() => agentPermissions.value?.update === true && agentPermissions.value.publish === true,
	);

	async function loadDetails(list: TaskBoardAgentOption[]) {
		const id = projectId.value;
		if (!id) return;
		loadingAgents.value = true;
		try {
			const results = await Promise.allSettled(
				list.map(async (agent) => await fetchAgent(rootStore.restApiContext, id, agent.id)),
			);
			// An agent that fails to load drops out of the list. The assignee picker still shows it.
			details.value = results.flatMap((result) =>
				result.status === 'fulfilled' ? [result.value] : [],
			);
		} finally {
			loadingAgents.value = false;
		}
	}

	watch(members.agents, loadDetails, { immediate: true });

	function agentEditorRoute(agentId: string): RouteLocationRaw {
		return { name: AGENT_BUILDER_VIEW, params: { projectId: projectId.value, agentId } };
	}

	/** The form values of a saved agent. Resolves null and shows a toast when the request fails. */
	async function loadAgentForm(agentId: string): Promise<AgentFormValues | null> {
		const id = projectId.value;
		if (!id) return null;
		try {
			const { config } = await fetchAgentConfig(rootStore.restApiContext, id, agentId);
			return toFormValues(config);
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.team.agent.loadError'));
			return null;
		}
	}

	async function createWithValues(id: string, values: AgentFormValues): Promise<string> {
		const context = rootStore.restApiContext;
		if (values.model) {
			const config = applyFormValues(emptyConfig(values.name), values);
			return (await createAgent(context, id, { name: values.name, config })).id;
		}
		// Without a config the server picks a default model and credential. The form values
		// then go into that config.
		const created = await createAgent(context, id, { name: values.name });
		const base = created.config ?? emptyConfig(values.name);
		await updateAgentConfig(context, id, created.id, {
			config: applyFormValues(base, values),
			baseConfigHash: created.configHash,
		});
		return created.id;
	}

	async function updateWithValues(id: string, agentId: string, values: AgentFormValues) {
		const context = rootStore.restApiContext;
		const { config, configHash } = await fetchAgentConfig(context, id, agentId);
		await updateAgentConfig(context, id, agentId, {
			config: applyFormValues(config, values),
			baseConfigHash: configHash,
		});
	}

	/** Publishes the draft. A failure keeps the agent as a draft and records the reason. */
	async function tryPublish(id: string, agentId: string): Promise<boolean> {
		try {
			await publishAgent(rootStore.restApiContext, id, agentId);
			const { [agentId]: _removed, ...rest } = publishErrors.value;
			publishErrors.value = rest;
			return true;
		} catch (error) {
			publishErrors.value = { ...publishErrors.value, [agentId]: getErrorMessage(error) };
			return false;
		}
	}

	function notifyPublishResult(published: boolean, name: string) {
		toast.showMessage({
			type: published ? 'success' : 'warning',
			title: i18n.baseText(
				published ? 'taskBoard.team.agent.published' : 'taskBoard.team.agent.savedAsDraft',
				{ interpolate: { name } },
			),
			message: published ? undefined : i18n.baseText('taskBoard.team.agent.draftHint'),
		});
	}

	/** Creates or updates an agent, then publishes it. Resolves false when the save fails. */
	async function saveAgent(values: AgentFormValues, agentId?: string): Promise<boolean> {
		const id = projectId.value;
		if (!id) return false;
		saving.value = true;
		try {
			let savedId = agentId;
			try {
				if (savedId) {
					await updateWithValues(id, savedId, values);
				} else {
					savedId = await createWithValues(id, values);
					await addTaskBoardAgent(rootStore.restApiContext, boardRef(), savedId);
				}
			} catch (error) {
				toast.showError(error, i18n.baseText('taskBoard.team.agent.saveError'));
				return false;
			}
			notifyPublishResult(await tryPublish(id, savedId), values.name);
			// The board has the ids of its agents, and the project list has their names.
			await Promise.all([members.load(), refreshBoard()]);
			return true;
		} finally {
			saving.value = false;
		}
	}

	const dialogOpen = ref(false);
	/** The agent the dialog edits. Undefined when the dialog adds an agent. */
	const editingAgentId = ref<string>();
	const editingValues = ref<AgentFormValues>();

	function openAddDialog() {
		editingAgentId.value = undefined;
		editingValues.value = undefined;
		dialogOpen.value = true;
	}

	async function openEditDialog(agent: TeamAgent) {
		const values = await loadAgentForm(agent.id);
		if (!values) return;
		editingAgentId.value = agent.id;
		editingValues.value = values;
		dialogOpen.value = true;
	}

	async function submitDialog(values: AgentFormValues) {
		if (await saveAgent(values, editingAgentId.value)) dialogOpen.value = false;
	}

	/** Publishes a draft agent from its row. */
	async function publish(agent: TeamAgent) {
		const id = projectId.value;
		if (!id) return;
		publishingId.value = agent.id;
		try {
			notifyPublishResult(await tryPublish(id, agent.id), agent.name);
			await members.load();
		} finally {
			publishingId.value = null;
		}
	}

	return {
		projectId,
		agentsEnabled,
		people: members.people,
		agents,
		loadingAgents,
		saving,
		publishingId,
		canAddAgent,
		canEditAgent,
		agentEditorRoute,
		publish,
		dialogOpen,
		editingAgentId,
		editingValues,
		openAddDialog,
		openEditDialog,
		submitDialog,
	};
}
