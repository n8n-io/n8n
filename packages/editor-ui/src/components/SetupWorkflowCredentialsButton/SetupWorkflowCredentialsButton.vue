<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, onBeforeUnmount } from 'vue';

const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const posthogStore = usePostHog();
const i18n = useI18n();

const showButton = computed(() => {
	const isFeatureEnabled = posthogStore.isFeatureEnabled(TEMPLATE_CREDENTIAL_SETUP_EXPERIMENT);
	const isCreatedFromTemplate = !!workflowsStore.workflow?.meta?.templateId;

	return isFeatureEnabled && isCreatedFromTemplate;
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
		size="large"
		@click="handleClick()"
	/>
</template>
