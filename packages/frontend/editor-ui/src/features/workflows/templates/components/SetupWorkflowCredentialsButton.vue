<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { doesNodeHaveAllCredentialsFilled } from '@/app/utils/nodes/nodeTransforms';

import { N8nButton } from '@n8n/design-system';
import { usePostHog } from '@/app/stores/posthog.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useRoute } from 'vue-router';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

const workflowsStore = useWorkflowsStore();
const readyToRunStore = useReadyToRunStore();
const workflowState = injectWorkflowState();
const nodeTypesStore = useNodeTypesStore();
const posthogStore = usePostHog();
const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();
const setupPanelStore = useSetupPanelStore();
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

const isNewTemplatesSetupEnabled = computed(() => {
	return (
		posthogStore.getVariant(TEMPLATE_SETUP_EXPERIENCE.name) === TEMPLATE_SETUP_EXPERIENCE.variant
	);
});

const isSetupPanelFeatureEnabled = computed(() => {
	return setupPanelStore.isFeatureEnabled;
});

const showButton = computed(() => {
	const isCreatedFromTemplate = !!workflowsStore.workflow?.meta?.templateId;
	if (!isCreatedFromTemplate) {
		return false;
	}

	if (isSetupPanelFeatureEnabled.value) {
		return workflowsStore.getNodes().length > 0;
	}

	if (isTemplateSetupCompleted.value) {
		return false;
	}

	return !allCredentialsFilled.value;
});

const isButtonDisabled = computed(() => {
	return (
		isSetupPanelFeatureEnabled.value &&
		focusPanelStore.focusPanelActive &&
		focusPanelStore.selectedTab === 'setup'
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

const openSetupPanel = () => {
	focusPanelStore.setSelectedTab('setup');
	focusPanelStore.openFocusPanel();
};

const openSetupModal = () => {
	uiStore.openModal(SETUP_CREDENTIALS_MODAL_KEY);
};

const handleTemplateSetup = () => {
	if (isSetupPanelFeatureEnabled.value) {
		openSetupPanel();
	} else {
		openSetupModal();
	}
};

onBeforeUnmount(() => {
	uiStore.closeModal(SETUP_CREDENTIALS_MODAL_KEY);
});

onMounted(async () => {
	// Wait for all reactive updates to settle before checking conditions
	// This ensures workflow.meta.templateId is available after initialization
	await nextTick();

	const templateId = workflowsStore.workflow?.meta?.templateId;
	const isReadyToRunWorkflow = readyToRunStore.isReadyToRunTemplateId(templateId);

	if (
		isNewTemplatesSetupEnabled.value &&
		showButton.value &&
		!isReadyToRunWorkflow &&
		isTemplateImportRoute.value
	) {
		handleTemplateSetup();
	}
});
</script>

<template>
	<N8nButton
		variant="subtle"
		v-if="showButton"
		:label="i18n.baseText('nodeView.setupTemplate')"
		:disabled="isButtonDisabled"
		data-test-id="setup-credentials-button"
		size="large"
		icon="package-open"
		@click="handleTemplateSetup()"
	/>
</template>
