<script lang="ts" setup>
import { provide, computed, onMounted } from 'vue';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowInitialization } from '@/app/composables/useWorkflowInitialization';

const workflowState = useWorkflowState();
const { initializeData, initializeWorkflow } = useWorkflowInitialization(workflowState);

const workflowId = computed(() => 'demo');

onMounted(async () => {
	await initializeData();
	await initializeWorkflow();
});

provide(WorkflowIdKey, workflowId);
</script>

<template>
	<BaseLayout>
		<RouterView />
		<template #footer>
			<DemoFooter />
		</template>
	</BaseLayout>
</template>
