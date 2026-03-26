import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { getResourcePermissions } from '@n8n/permissions';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { executionRetryMessage } from '@/features/execution/executions/executions.utils';
import type { ExecutionSummary, AnnotationVote } from 'n8n-workflow';
import type { CommandGroup, CommandBarItem } from '../types';

const ITEM_ID = {
	DELETE_EXECUTION: 'delete-execution',
	RETRY_CURRENT_WORKFLOW: 'retry-current-workflow',
	RETRY_ORIGINAL_WORKFLOW: 'retry-original-workflow',
	STOP_EXECUTION: 'stop-execution',
	DEBUG_EXECUTION: 'debug-execution',
	VOTE_UP: 'vote-up',
	VOTE_DOWN: 'vote-down',
} as const;

export function useExecutionCommands(): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const route = useRoute();
	const executionsStore = useExecutionsStore();
	const workflowsListStore = useWorkflowsListStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();
	const message = useMessage();
	const telemetry = useTelemetry();

	const workflowId = computed(() => route.params.name as string);

	const activeExecution = computed(() => {
		return executionsStore.activeExecution as ExecutionSummary & {
			customData?: Record<string, string>;
		};
	});

	const workflowPermissions = computed(
		() =>
			getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow,
	);

	const isAnnotationEnabled = computed(
		() =>
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
	);

	const hasAnnotation = computed(
		() =>
			!!activeExecution.value?.annotation &&
			(activeExecution.value?.annotation.vote || activeExecution.value?.annotation.tags.length > 0),
	);

	const vote = computed(() => activeExecution.value?.annotation?.vote || null);

	const executions = computed(() =>
		workflowId.value
			? [
					...(executionsStore.currentExecutionsByWorkflowId[workflowId.value] ?? []),
					...(executionsStore.executionsByWorkflowId[workflowId.value] ?? []),
				]
			: [],
	);

	const isRetriable = computed(() => {
		if (!activeExecution.value) return false;
		const status = activeExecution.value.status;
		return status === 'error' || status === 'crashed' || status === 'canceled';
	});

	const isRunning = computed(() => {
		if (!activeExecution.value) return false;
		return activeExecution.value.status === 'running' || activeExecution.value.status === 'new';
	});

	async function handleDeleteExecution() {
		const confirmationText = [
			hasAnnotation.value && i18n.baseText('executionDetails.confirmMessage.annotationsNote'),
			i18n.baseText('executionDetails.confirmMessage.message'),
		]
			.filter(Boolean)
			.join(' ');

		const deleteConfirmed = await message.confirm(
			confirmationText,
			i18n.baseText('executionDetails.confirmMessage.headline'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('executionDetails.confirmMessage.confirmButtonText'),
				cancelButtonText: '',
			},
		);

		if (deleteConfirmed !== MODAL_CONFIRM) {
			return;
		}

		try {
			const executionId = activeExecution.value.id;
			const executionIndex = executions.value.findIndex(
				(e: ExecutionSummary) => e.id === executionId,
			);

			const nextExecution =
				executions.value[executionIndex + 1] ||
				executions.value[executionIndex - 1] ||
				executions.value[0];

			await executionsStore.deleteExecutions({
				ids: [executionId],
			});

			if (executions.value.length > 0) {
				await router
					.replace({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: workflowId.value, executionId: nextExecution.id },
					})
					.catch(() => {});
			} else {
				await router.replace({
					name: VIEWS.EXECUTION_HOME,
					params: { name: workflowId.value },
				});
			}

			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.handleDeleteSelected.title'),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('executionsList.showError.handleDeleteSelected.title'));
		}
	}

	async function handleRetryExecution(loadWorkflow: boolean) {
		toast.showMessage({
			title: i18n.baseText('executionDetails.runningMessage'),
			type: 'info',
			duration: 2000,
		});

		try {
			const retriedExecution = await executionsStore.retryExecution(
				activeExecution.value.id,
				loadWorkflow,
			);

			const retryMessage = executionRetryMessage(retriedExecution.status);

			if (retryMessage) {
				toast.showMessage(retryMessage);
			}

			telemetry.track('User clicked retry execution button', {
				workflow_id: workflowId.value,
				execution_id: activeExecution.value.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('executionsList.showError.retryExecution.title'));
		}
	}

	async function handleStopExecution() {
		try {
			await executionsStore.stopCurrentExecution(activeExecution.value.id);

			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.stopExecution.title'),
				message: i18n.baseText('executionsList.showMessage.stopExecution.message', {
					interpolate: { activeExecutionId: activeExecution.value.id },
				}),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
		}
	}

	function handleDebugExecution() {
		void router.push({
			name: VIEWS.EXECUTION_DEBUG,
			params: {
				name: activeExecution.value.workflowId,
				executionId: activeExecution.value.id,
			},
		});
	}

	async function handleVoteClick(voteValue: AnnotationVote) {
		const voteToSet = voteValue === vote.value ? null : voteValue;

		try {
			await executionsStore.annotateExecution(activeExecution.value.id, { vote: voteToSet });
		} catch (e) {
			toast.showError(e, 'executionAnnotationView.vote.error');
		}
	}

	const executionCommands = computed<CommandBarItem[]>(() => {
		if (!activeExecution.value) return [];

		const commands: CommandBarItem[] = [];

		if (workflowPermissions.value.update) {
			const isSuccess = activeExecution.value.status === 'success';
			commands.push({
				id: ITEM_ID.DEBUG_EXECUTION,
				title: isSuccess
					? i18n.baseText('executionsList.debug.button.copyToEditor')
					: i18n.baseText('executionsList.debug.button.debugInEditor'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: handleDebugExecution,
				icon: {
					component: N8nIcon,
					props: {
						icon: isSuccess ? 'copy' : 'bug',
					},
				},
			});
		}

		if (isRetriable.value && workflowPermissions.value.update) {
			commands.push({
				id: ITEM_ID.RETRY_CURRENT_WORKFLOW,
				title: i18n.baseText('executionsList.retryWithCurrentlySavedWorkflow'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: async () => await handleRetryExecution(true),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'redo-2',
					},
				},
			});

			commands.push({
				id: ITEM_ID.RETRY_ORIGINAL_WORKFLOW,
				title: i18n.baseText('executionsList.retryWithOriginalWorkflow'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: async () => await handleRetryExecution(false),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'redo',
					},
				},
			});
		}

		if (isRunning.value && workflowPermissions.value.execute) {
			commands.push({
				id: ITEM_ID.STOP_EXECUTION,
				title: i18n.baseText('executionsList.stopExecution'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: handleStopExecution,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'stop',
					},
				},
			});
		}

		if (isAnnotationEnabled.value) {
			commands.push({
				id: ITEM_ID.VOTE_UP,
				title:
					vote.value === 'up'
						? i18n.baseText('executionAnnotationView.vote.removeUp')
						: i18n.baseText('executionAnnotationView.vote.up'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: async () => await handleVoteClick('up'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'thumbs-up',
					},
				},
			});

			commands.push({
				id: ITEM_ID.VOTE_DOWN,
				title:
					vote.value === 'down'
						? i18n.baseText('executionAnnotationView.vote.removeDown')
						: i18n.baseText('executionAnnotationView.vote.down'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: async () => await handleVoteClick('down'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'thumbs-down',
					},
				},
			});
		}

		if (workflowPermissions.value.update) {
			commands.push({
				id: ITEM_ID.DELETE_EXECUTION,
				title: i18n.baseText('executionDetails.deleteExecution'),
				section: i18n.baseText('commandBar.sections.execution'),
				handler: handleDeleteExecution,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'trash-2',
					},
				},
			});
		}

		return commands;
	});

	return {
		commands: executionCommands,
	};
}
