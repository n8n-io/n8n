<script setup lang="ts">
import { VIEWS } from '@/constants';
import { useTemplatesStore, useWorkflowsStore } from '@/stores';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const templateStore = useTemplatesStore();
const workfowStore = useWorkflowsStore();
const router = useRouter();
const route = useRoute();

const openWorkflowTemplate = async (templateId: string) => {
	try {
		const template = await templateStore.getFixedWorkflowTemplate(templateId);
		if (!template) {
			throw new Error();
		}

		const workflow = await workfowStore.createNewWorkflow({
			name: template.name,
			connections: template.workflow.connections,
			nodes: template.workflow.nodes,
			meta: {
				onboardingId: templateId,
			},
		});

		await router.replace({
			name: VIEWS.WORKFLOW,
			params: { name: workflow.id },
			query: { onboardingId: templateId },
		});
	} catch (e) {
		await router.replace({ name: VIEWS.NEW_WORKFLOW });
	}
};

onMounted(async () => {
	const templateId = route.params.id;
	if (!templateId || typeof templateId !== 'string') {
		await router.replace({ name: VIEWS.NEW_WORKFLOW });
		return;
	}

	await openWorkflowTemplate(templateId);
});
</script>

<template>
	<div></div>
</template>

<style lang="scss" module></style>
