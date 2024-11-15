<script setup lang="ts">
import { useLoadingService } from '@/composables/useLoadingService';
import { useI18n } from '@/composables/useI18n';
import {
	NEW_SAMPLE_WORKFLOW_CREATED_CHANNEL,
	SAMPLE_SUBWORKFLOW_WORKFLOW,
	SAMPLE_SUBWORKFLOW_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import { useTemplatesStore } from '@/stores/templates.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IWorkflowDataCreate } from '@/Interface';

const loadingService = useLoadingService();
const templateStore = useTemplatesStore();
const workflowsStore = useWorkflowsStore();
const router = useRouter();
const route = useRoute();
const i18n = useI18n();

const openWorkflowTemplate = async (templateId: string) => {
	if (templateId === SAMPLE_SUBWORKFLOW_WORKFLOW_ID) {
		await openSampleSubworkflow();
		return;
	}

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

const openSampleSubworkflow = async () => {
	try {
		loadingService.startLoading();

		const projectId = route.query?.projectId;

		const sampleSubWorkflows = Number(route.query?.sampleSubWorkflows ?? 0);

		const workflowName = `${SAMPLE_SUBWORKFLOW_WORKFLOW.name} ${sampleSubWorkflows + 1}`;

		const workflow: IWorkflowDataCreate = {
			...SAMPLE_SUBWORKFLOW_WORKFLOW,
			name: workflowName,
		};

		if (projectId) {
			workflow.projectId = projectId as string;
		}

		const newWorkflow = await workflowsStore.createNewWorkflow(workflow);

		const sampleSubworkflowChannel = new BroadcastChannel(NEW_SAMPLE_WORKFLOW_CREATED_CHANNEL);

		sampleSubworkflowChannel.postMessage({ workflowId: newWorkflow.id });

		await router.replace({
			name: VIEWS.WORKFLOW,
			params: { name: newWorkflow.id },
		});
		loadingService.stopLoading();
	} catch (e) {
		await router.replace({ name: VIEWS.NEW_WORKFLOW });
		loadingService.stopLoading();
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
