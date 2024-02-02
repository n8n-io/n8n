<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import GlobalExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
import { setPageTitle } from '@/utils/htmlUtils';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useToast } from '@/composables/useToast';
import { storeToRefs } from 'pinia';
import { isEmpty } from '@/utils/typesUtils';
import { filterExecutions } from '@/utils/executionUtils';

const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();

const toast = useToast();

const { executionsCount, executionsCountEstimated, filters } = storeToRefs(executionsStore);

const executions = computed(() => [
	...executionsStore.currentExecutions,
	...executionsStore.executions,
]);

const filteredExecutions = computed(() => filterExecutions(executions.value, filters.value));

onBeforeMount(async () => {
	await loadWorkflows();

	void externalHooks.run('executionsList.openDialog');
	telemetry.track('User opened Executions log', {
		workflow_id: workflowsStore.workflowId,
	});
});

onMounted(() => {
	setPageTitle(`n8n - ${i18n.baseText('executionsList.workflowExecutions')}`);

	void executionsStore.initialize();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	executionsStore.terminate();
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});

async function loadWorkflows() {
	try {
		await workflowsStore.fetchAllWorkflows();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.loadWorkflows.title'));
	}
}

function onDocumentVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		executionsStore.stopAutoRefreshInterval();
	} else {
		void executionsStore.startAutoRefreshInterval();
	}
}

async function onAutoRefreshToggle(value: boolean) {
	if (value) {
		await executionsStore.startAutoRefreshInterval();
	} else {
		executionsStore.stopAutoRefreshInterval();
	}
}

async function onRefreshData() {
	try {
		await executionsStore.fetchExecutions();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
	}
}

async function onUpdateFilters() {
	await onRefreshData();
}

async function onExecutionStop() {
	await onRefreshData();
}
</script>
<template>
	<GlobalExecutionsList
		:executions="executions"
		:filtered-executions="filteredExecutions"
		:filters="filters"
		:total="executionsCount"
		:estimated-total="executionsCountEstimated"
		@execution:stop="onExecutionStop"
		@update:filters="onUpdateFilters"
		@update:auto-refresh="onAutoRefreshToggle"
	/>
</template>
