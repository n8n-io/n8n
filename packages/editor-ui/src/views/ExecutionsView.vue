<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue';
import GlobalExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
import { setPageTitle } from '@/utils/htmlUtils';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useToast } from '@/composables/useToast';
import { storeToRefs } from 'pinia';
import type { ExecutionFilterType } from '@/Interface';

const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();

const toast = useToast();

const animationsEnabled = ref(false);

const { executionsCount, executionsCountEstimated, filters, allExecutions } =
	storeToRefs(executionsStore);

onBeforeMount(async () => {
	await loadWorkflows();

	void externalHooks.run('executionsList.openDialog');
	telemetry.track('User opened Executions log', {
		workflow_id: workflowsStore.workflowId,
	});
});

onMounted(async () => {
	setPageTitle(`n8n - ${i18n.baseText('executionsList.workflowExecutions')}`);
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);

	await executionsStore.initialize();
});

onBeforeUnmount(() => {
	executionsStore.reset();
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

async function onRefreshData() {
	try {
		await executionsStore.fetchExecutions();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
	}
}

async function onUpdateFilters(newFilters: ExecutionFilterType) {
	executionsStore.reset();
	executionsStore.setFilters(newFilters);
	await executionsStore.initialize();
}

async function onExecutionStop() {
	await onRefreshData();
}
</script>
<template>
	<GlobalExecutionsList
		:executions="allExecutions"
		:filters="filters"
		:total="executionsCount"
		:estimated-total="executionsCountEstimated"
		@execution:stop="onExecutionStop"
		@update:filters="onUpdateFilters"
	/>
</template>
