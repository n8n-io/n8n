<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import WorkflowExecutionsList from '../components/workflow/WorkflowExecutionsList.vue';
import { useExecutionsStore } from '../executions.store';
import { useI18n } from '@n8n/i18n';
import type { ExecutionFilterType } from '../executions.types';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { NO_NETWORK_ERROR_CODE } from '@n8n/rest-api-client';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useRoute, useRouter } from 'vue-router';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import type { ExecutionSummary } from 'n8n-workflow';
import { useDebounce } from '@/app/composables/useDebounce';
import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	executionRetryMessage,
	getFriendlyHubWorkflowName,
	getSingleNodeHeadline,
	isHubPlaceholderName,
} from '../executions.utils';
import type { SingleNodeExecutionSummaryExtras } from '../executions.types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

const executionsStore = useExecutionsStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
);
const workflowsListStore = useWorkflowsListStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();

const loading = ref(false);
const loadingMore = ref(false);

const workflow = ref<IWorkflowDb | undefined>();

const workflowId = useInjectWorkflowId();

const executionId = computed(() => {
	const id = route.params.executionId;
	return typeof id === 'string' ? id : undefined;
});

const executions = computed(() =>
	workflowId.value
		? [
				...(executionsStore.currentExecutionsByWorkflowId[workflowId.value] ?? []),
				...(executionsStore.executionsByWorkflowId[workflowId.value] ?? []),
			]
		: [],
);

const execution = computed(() => {
	const fromList = executions.value.find((e) => e.id === executionId.value);
	const current = currentExecution.value;

	if (!fromList) {
		return current;
	}

	// Keep workflowVersionId from execution details if available
	if (current?.id === fromList.id && current.workflowVersionId) {
		return { ...fromList, workflowVersionId: current.workflowVersionId };
	}

	return fromList;
});

const currentExecution = ref<ExecutionSummary | undefined>();

// Single-node executions (n8n Hub Phase 5.3) may target a synthesized workflowId
// that has no saved entity. Synthesize a minimal placeholder so the executions
// list still renders the detail panel for the caller summary.
const placeholderWorkflow = computed<IWorkflowDb | undefined>(() => {
	if (workflow.value || !workflowId.value) return undefined;
	if (execution.value?.mode !== 'single-node') return undefined;
	const fallback: IWorkflowDb = {
		id: workflowId.value,
		name: execution.value?.workflowName ?? '',
		active: false,
		isArchived: false,
		createdAt: 0,
		updatedAt: 0,
		nodes: [],
		connections: {},
		settings: { executionOrder: 'v1' },
		tags: [],
		pinData: {},
		versionId: '',
		activeVersionId: null,
		usedCredentials: [],
		sharedWithProjects: [],
		scopes: [],
	};
	return fallback;
});

const effectiveWorkflow = computed<IWorkflowDb | undefined>(
	() => workflow.value ?? placeholderWorkflow.value,
);

// Check if this is a new workflow by looking for the ?new query param
const isNewWorkflowRoute = computed(() => {
	return route.query.new === 'true';
});

watch(
	() => workflowId.value,
	() => {
		fetchWorkflow();
	},
);

watch(
	() => executionId.value,
	async () => {
		await fetchExecution();
	},
);

// For n8n Hub single-node executions the placeholder workflow's `name` is a
// structural id (e.g. `__n8n-hub-action::n8n-nodes-base.slack.message.search`).
// The richer `actionDisplayName` ("Slack - Search for messages") only becomes
// available once the execution is fetched. Re-set the browser tab title here
// so it lines up with the header breadcrumb.
watch([() => currentExecution.value?.id, () => effectiveWorkflow.value?.name], () => {
	const wfName = effectiveWorkflow.value?.name;
	if (!wfName || !isHubPlaceholderName(wfName)) return;
	const active = currentExecution.value as
		| (ExecutionSummary & SingleNodeExecutionSummaryExtras)
		| undefined;
	const friendly =
		active?.actionDisplayName ??
		(active
			? getSingleNodeHeadline(active, getFriendlyHubWorkflowName(wfName))
			: getFriendlyHubWorkflowName(wfName));
	documentTitle.setDocumentTitle(friendly, 'IDLE');
});

onMounted(async () => {
	fetchWorkflow();

	if (workflowId.value) {
		await Promise.all([executionsStore.initialize(workflowId.value), fetchExecution()]);
	}

	await initializeRoute();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	executionsStore.reset();
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});

async function fetchExecution() {
	if (!executionId.value) {
		return;
	}

	try {
		currentExecution.value = (await executionsStore.fetchExecution(
			executionId.value,
		)) as ExecutionSummary;
		executionsStore.activeExecution = currentExecution.value;
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeView.showError.openExecution.title'));
	}

	if (!currentExecution.value) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('openExecution.missingExeuctionId.title'),
			message: i18n.baseText('openExecution.missingExeuctionId.message'),
		});

		return;
	}
}

function onDocumentVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		executionsStore.stopAutoRefreshInterval();
	} else {
		void executionsStore.startAutoRefreshInterval(workflowId.value);
	}
}

async function initializeRoute() {
	if (route.name === VIEWS.EXECUTION_HOME && executions.value.length > 0 && workflow.value) {
		await router
			.replace({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { workflowId: workflow.value.id, executionId: executions.value[0].id },
				query: route.query,
			})
			.catch(() => {});
	}
}

function fetchWorkflow() {
	// Skip fetching if it's a new workflow that hasn't been saved yet
	if (isNewWorkflowRoute.value || !workflowId.value) {
		workflow.value = workflowDocumentStore.value.getSnapshot();
		return;
	}

	// Use the workflow from the list store (already loaded by WorkflowLayout)
	workflow.value =
		workflowsListStore.workflowsById[workflowId.value] ?? workflowDocumentStore.value.getSnapshot();
}

async function onAutoRefreshToggle(value: boolean) {
	if (value) {
		await executionsStore.startAutoRefreshInterval(workflowId.value);
	} else {
		executionsStore.stopAutoRefreshInterval();
	}
}

async function onRefreshData() {
	if (!workflowId.value) {
		return;
	}

	try {
		await executionsStore.fetchExecutions({
			...executionsStore.executionsFilters,
			workflowId: workflowId.value,
		});
	} catch (error) {
		if (error.errorCode === NO_NETWORK_ERROR_CODE) {
			toast.showMessage(
				{
					title: i18n.baseText('executionsList.showError.refreshData.title'),
					message: error.message,
					type: 'error',
					duration: 3500,
				},
				false,
			);
		} else {
			toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
		}
	}
}

async function onUpdateFilters(newFilters: ExecutionFilterType) {
	executionsStore.reset();
	executionsStore.setFilters(newFilters);
	await executionsStore.initialize(workflowId.value);
}

async function onExecutionStop(id?: string) {
	if (!id) {
		return;
	}
	try {
		await executionsStore.stopCurrentExecution(id);

		toast.showMessage({
			title: i18n.baseText('executionsList.showMessage.stopExecution.title'),
			message: i18n.baseText('executionsList.showMessage.stopExecution.message', {
				interpolate: { activeExecutionId: id },
			}),
			type: 'success',
		});

		await onRefreshData();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
	}
}

async function onExecutionDelete(id?: string) {
	if (!id) {
		return;
	}
	loading.value = true;
	try {
		const executionIndex = executions.value.findIndex((e: ExecutionSummary) => e.id === id);

		const nextExecution =
			executions.value[executionIndex + 1] ||
			executions.value[executionIndex - 1] ||
			executions.value[0];

		await executionsStore.deleteExecutions({
			ids: [id],
		});

		if (workflow.value) {
			if (executions.value.length > 0) {
				await router
					.replace({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { workflowId: workflow.value.id, executionId: nextExecution.id },
					})
					.catch(() => {});
			} else {
				// If there are no executions left, show empty state
				await router.replace({
					name: VIEWS.EXECUTION_HOME,
					params: { workflowId: workflow.value.id },
				});
			}
		}
	} catch (error) {
		loading.value = false;
		toast.showError(error, i18n.baseText('executionsList.showError.handleDeleteSelected.title'));
		return;
	}
	loading.value = false;

	toast.showMessage({
		title: i18n.baseText('executionsList.showMessage.handleDeleteSelected.title'),
		type: 'success',
	});
}

async function onExecutionRetry(payload: { id: string; loadWorkflow: boolean }) {
	toast.showMessage({
		title: i18n.baseText('executionDetails.runningMessage'),
		type: 'info',
		duration: 2000,
	});

	await retryExecution(payload);
	await onRefreshData();

	telemetry.track('User clicked retry execution button', {
		workflow_id: workflow.value?.id,
		execution_id: payload.id,
		retry_type: payload.loadWorkflow ? 'current' : 'original',
	});
}

async function retryExecution(payload: { id: string; loadWorkflow: boolean }) {
	try {
		const retriedExecution = await executionsStore.retryExecution(payload.id, payload.loadWorkflow);

		const retryMessage = executionRetryMessage(retriedExecution.status);

		if (retryMessage) {
			toast.showMessage(retryMessage);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.retryExecution.title'));
	}
}

async function onLoadMore(): Promise<void> {
	if (!loadingMore.value) {
		await callDebounced(loadMore, { debounceTime: 1000 });
	}
}

const hasMore = computed(
	() =>
		!executionsStore.executionsFilters.status?.includes('running') &&
		executions.value.length < executionsStore.executionsCount,
);

async function loadMore(): Promise<void> {
	if (!hasMore.value) {
		return;
	}

	loadingMore.value = true;

	let lastId: string | undefined;
	if (executions.value.length !== 0) {
		const lastItem = executions.value.slice(-1)[0];
		lastId = lastItem.id;
	}

	try {
		await executionsStore.fetchExecutions(executionsStore.executionsFilters, lastId);
	} catch (error) {
		loadingMore.value = false;
		toast.showError(error, i18n.baseText('executionsList.showError.loadMore.title'));
		return;
	}

	loadingMore.value = false;
}
</script>
<template>
	<WorkflowExecutionsList
		v-if="effectiveWorkflow"
		:executions="executions"
		:execution="execution"
		:workflow="effectiveWorkflow"
		:loading="loading"
		:loading-more="loadingMore"
		:has-more="hasMore"
		@execution:stop="onExecutionStop"
		@execution:delete="onExecutionDelete"
		@execution:retry="onExecutionRetry"
		@update:filters="onUpdateFilters"
		@update:auto-refresh="onAutoRefreshToggle"
		@load-more="onLoadMore"
		@reload="onRefreshData"
	/>
</template>
