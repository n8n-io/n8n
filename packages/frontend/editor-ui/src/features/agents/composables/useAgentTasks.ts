import type { AgentConfigValidationIssue, AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import {
	computed,
	onBeforeUnmount,
	onMounted,
	ref,
	watch,
	type MaybeRefOrGetter,
	toValue,
} from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { deleteAgentTask, getAgentTasks } from './useAgentApi';
import { AGENT_TASK_MODAL_KEY } from '../constants';
import { resolveAgentValidationIssueMessageKey } from '../utils/agentValidationIssueMessages';

export type AgentTaskRow = AgentTaskDto & {
	enabled: boolean;
	invalid: boolean;
	invalidReasons: string[];
};

export interface UseAgentTasksOptions {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	taskRefs: MaybeRefOrGetter<AgentJsonTaskConfig[]>;
	validationIssues: MaybeRefOrGetter<AgentConfigValidationIssue[]>;
	disabled: MaybeRefOrGetter<boolean>;
	isPublished: MaybeRefOrGetter<boolean>;
	isRunnable: MaybeRefOrGetter<boolean>;
	reloadKey: MaybeRefOrGetter<number | undefined>;
	/** No agent row exists yet, so an unsaved agent has no tasks to load. */
	agentUnsaved: MaybeRefOrGetter<boolean | undefined>;
	previewDisabledReason: () => string | undefined;
	/** Returns the current persist callback. A getter, so a later prop value is used. */
	getEnsureAgentPersisted: () => (() => Promise<void>) | undefined;
	onToggle: (payload: { id: string; enabled: boolean }) => void;
	onChanged: () => void;
	onPreview: (instructions: string) => void;
}

/**
 * Loads the scheduled tasks of an agent and gives the actions that the
 * schedule rows and the triggers list share.
 */
export function useAgentTasks(options: UseAgentTasksOptions) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const toast = useToast();

	const taskBodies = ref<AgentTaskDto[]>([]);
	const taskErrorMessage = ref('');
	const removingTaskId = ref<string | null>(null);
	let active = true;

	onBeforeUnmount(() => {
		active = false;
	});

	function isCurrentAgent(projectId: string, agentId: string) {
		return (
			active && toValue(options.projectId) === projectId && toValue(options.agentId) === agentId
		);
	}

	const taskIssueMessages = computed(() => {
		const messages = new Map<string, string[]>();
		for (const issue of toValue(options.validationIssues)) {
			if (issue.capability.kind !== 'task' || !issue.capability.id) continue;
			const message = i18n.baseText(resolveAgentValidationIssueMessageKey(issue), {
				interpolate: { id: issue.capability.id },
			});
			messages.set(issue.capability.id, [
				...new Set([...(messages.get(issue.capability.id) ?? []), message]),
			]);
		}
		return messages;
	});

	const taskRows = computed<AgentTaskRow[]>(() => {
		const refsById = new Map(toValue(options.taskRefs).map((taskRef) => [taskRef.id, taskRef]));
		return taskBodies.value.map((body) => {
			const invalidReasons = taskIssueMessages.value.get(body.id) ?? [];
			return {
				...body,
				enabled: refsById.get(body.id)?.enabled ?? true,
				invalid: invalidReasons.length > 0,
				invalidReasons,
			};
		});
	});

	async function reloadTasks() {
		const projectId = toValue(options.projectId);
		const agentId = toValue(options.agentId);
		taskErrorMessage.value = '';
		if (toValue(options.agentUnsaved)) {
			taskBodies.value = [];
			return;
		}

		try {
			const tasks = await getAgentTasks(rootStore.restApiContext, projectId, agentId);
			if (isCurrentAgent(projectId, agentId)) taskBodies.value = tasks;
		} catch (error) {
			if (!isCurrentAgent(projectId, agentId)) return;
			taskErrorMessage.value =
				error instanceof Error && error.message
					? error.message
					: i18n.baseText('agents.builder.tasks.loadError');
		}
	}

	function onTasksChanged() {
		void reloadTasks();
		options.onChanged();
	}

	function toggleTask(task: AgentTaskRow, enabled: boolean) {
		if (toValue(options.disabled) || removingTaskId.value) return;
		options.onToggle({ id: task.id, enabled });
	}

	async function removeTask(task: AgentTaskRow) {
		if (toValue(options.disabled) || removingTaskId.value) return;
		const projectId = toValue(options.projectId);
		const agentId = toValue(options.agentId);
		removingTaskId.value = task.id;
		try {
			await deleteAgentTask(rootStore.restApiContext, projectId, agentId, task.id);
			if (!isCurrentAgent(projectId, agentId)) return;
			taskBodies.value = taskBodies.value.filter(({ id }) => id !== task.id);
			onTasksChanged();
		} catch (error) {
			if (isCurrentAgent(projectId, agentId)) {
				toast.showError(error, i18n.baseText('agents.builder.tasks.removeError'));
			}
		} finally {
			removingTaskId.value = null;
		}
	}

	function openTaskModal(task: AgentTaskRow | null) {
		if (toValue(options.disabled)) return;

		const projectId = toValue(options.projectId);
		const agentId = toValue(options.agentId);
		uiStore.openModalWithData({
			name: AGENT_TASK_MODAL_KEY,
			data: {
				projectId,
				agentId,
				ensureAgentPersisted: options.getEnsureAgentPersisted(),
				task,
				isPublished: toValue(options.isPublished),
				isRunnable: toValue(options.isRunnable),
				validationIssues: toValue(options.validationIssues),
				getPreviewDisabledReason: options.previewDisabledReason,
				taskState: task ? { enabled: task.enabled } : undefined,
				onPreview: options.onPreview,
				onSaved: () => {
					if (isCurrentAgent(projectId, agentId)) onTasksChanged();
				},
			},
		});
	}

	onMounted(reloadTasks);

	watch(
		[
			() => toValue(options.reloadKey),
			() => toValue(options.projectId),
			() => toValue(options.agentId),
			() => toValue(options.agentUnsaved),
		],
		reloadTasks,
	);

	return {
		taskRows,
		taskErrorMessage,
		removingTaskId,
		reloadTasks,
		toggleTask,
		removeTask,
		openTaskModal,
	};
}
