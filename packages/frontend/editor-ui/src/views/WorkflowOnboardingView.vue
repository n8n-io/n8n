<script setup lang="ts">
import { useLoadingService } from '@/composables/useLoadingService';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const loadingService = useLoadingService();
const templateStore = useTemplatesStore();
const workflowsStore = useWorkflowsStore();
const router = useRouter();
const route = useRoute();
const i18n = useI18n();

const openWorkflowTemplate = async (templateId: string) => {
	try {
		loadingService.startLoading();
		const template = await templateStore.getFixedWorkflowTemplate(templateId);
		if (!template) {
			throw new Error();
		}

		const name: string = i18n.baseText('onboarding.title', {
			interpolate: { name: template.name },
		});

		const workflow = await workflowsStore.createNewWorkflow({
			name,
			connections: template.workflow.connections,
			nodes: template.workflow.nodes.map(workflowsStore.convertTemplateNodeToNodeUi),
			pinData: template.workflow.pinData,
			settings: template.workflow.settings,
			meta: {
				onboardingId: templateId,
			},
		});

		await router.replace({
			name: VIEWS.WORKFLOW,
			params: { name: workflow.id },
			query: { onboardingId: templateId },
		});

		loadingService.stopLoading();
	} catch (e) {
		await router.replace({ name: VIEWS.NEW_WORKFLOW });
		loadingService.stopLoading();

		throw new Error(`Could not load onboarding template ${templateId}`); // sentry reporing
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
