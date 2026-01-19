<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { doesNodeHaveAllCredentialsFilled } from '@/app/utils/nodes/nodeTransforms';

import { N8nButton } from '@n8n/design-system';
import { usePostHog } from '@/app/stores/posthog.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useRoute } from 'vue-router';

const workflowsStore = useWorkflowsStore();
const readyToRunStore = useReadyToRunStore();
const workflowState = injectWorkflowState();
const nodeTypesStore = useNodeTypesStore();
const posthogStore = usePostHog();
const uiStore = useUIStore();
const i18n = useI18n();
const route = useRoute();

const isTemplateImportRoute = computed(() => {
	return route.query.templateId !== undefined;
});

const isTemplateSetupCompleted = computed(() => {
	return !!workflowsStore.workflow?.meta?.templateCredsSetupCompleted;
});

const allCredentialsFilled = computed(() => {
	if (isTemplateSetupCompleted.value) {
		return true;
	}

	const nodes = workflowsStore.getNodes();
	if (!nodes.length) {
		return true;
	}

	return nodes.every((node) => doesNodeHaveAllCredentialsFilled(nodeTypesStore, node));
});

const showButton = computed(() => {
	const isCreatedFromTemplate = !!workflowsStore.workflow?.meta?.templateId;
	if (!isCreatedFromTemplate || isTemplateSetupCompleted.value) {
		return false;
	}

	return !allCredentialsFilled.value;
});

const isNewTemplatesSetupEnabled = computed(() => {
	return (
		posthogStore.getVariant(TEMPLATE_SETUP_EXPERIENCE.name) === TEMPLATE_SETUP_EXPERIENCE.variant
	);
});

const unsubscribe = watch(allCredentialsFilled, (newValue) => {
	if (newValue) {
		workflowState.addToWorkflowMetadata({
			templateCredsSetupCompleted: true,
		});

		unsubscribe();
	}
});

const openSetupModal = () => {
	uiStore.openModal(SETUP_CREDENTIALS_MODAL_KEY);
};

onBeforeUnmount(() => {
	uiStore.closeModal(SETUP_CREDENTIALS_MODAL_KEY);
});

onMounted(() => {
	const templateId = workflowsStore.workflow?.meta?.templateId;
	const isReadyToRunWorkflow = readyToRunStore.isReadyToRunTemplateId(templateId);

	if (
		isNewTemplatesSetupEnabled.value &&
		showButton.value &&
		!isReadyToRunWorkflow &&
		isTemplateImportRoute.value
	) {
		openSetupModal();
	}
});
</script>

<template>
	<N8nButton
		v-if="showButton"
		:label="i18n.baseText('nodeView.setupTemplate')"
		data-test-id="setup-credentials-button"
		size="large"
		icon="package-open"
		type="secondary"
		@click="openSetupModal()"
	/>
</template>
