<script lang="ts" setup>
import { provide, computed, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowIdKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const route = useRoute();

const workflowId = computed(() => {
	const name = route.params.name;
	return (Array.isArray(name) ? name[0] : name) as string;
});

const currentWorkflowDocumentStore = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
	null,
);

provide(WorkflowIdKey, workflowId);
provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);
</script>

<template>
	<BaseLayout>
		<RouterView />
		<template #footer>
			<DemoFooter />
		</template>
	</BaseLayout>
</template>
