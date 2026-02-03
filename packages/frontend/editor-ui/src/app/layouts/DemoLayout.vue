<script lang="ts" setup>
import { provide, computed } from 'vue';
import { useRoute } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import DemoFooter from '@/features/execution/logs/components/DemoFooter.vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

const route = useRoute();

const workflowId = computed(() => {
	const name = route.params.name;
	return (Array.isArray(name) ? name[0] : name) as string;
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
