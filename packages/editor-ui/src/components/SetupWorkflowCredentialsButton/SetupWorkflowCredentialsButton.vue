<script lang="ts" setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { usePostHog } from '@/stores/posthog.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { doesNodeHaveAllCredentialsFilled } from '@/utils/nodes/nodeTransforms';

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const posthogStore = usePostHog();
const i18n = useI18n();

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
	const isFeatureEnabled = posthogStore.isFeatureEnabled(TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT);
	const isCreatedFromTemplate = !!workflowsStore.workflow?.meta?.templateId;
	if (!isFeatureEnabled || !isCreatedFromTemplate || isTemplateSetupCompleted.value) {
		return false;
	}

	return !allCredentialsFilled.value;
});

const unsubscribe = watch(allCredentialsFilled, (newValue) => {
	if (newValue) {
		workflowsStore.addToWorkflowMetadata({
			templateCredsSetupCompleted: true,
		});

		unsubscribe();
	}
});

const handleClick = () => {
	uiStore.openModal(SETUP_CREDENTIALS_MODAL_KEY);
};

onBeforeUnmount(() => {
	uiStore.closeModal(SETUP_CREDENTIALS_MODAL_KEY);
});
</script>

<template>
	<n8n-button
		v-if="showButton"
		:label="i18n.baseText('nodeView.setupTemplate')"
		data-test-id="setup-credentials-button"
		size="large"
		icon="box-open"
		type="secondary"
		@click="handleClick()"
	/>
</template>
