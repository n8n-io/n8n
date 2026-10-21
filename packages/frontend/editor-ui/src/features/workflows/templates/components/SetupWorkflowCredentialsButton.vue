<script lang="ts" setup>
import { computed, onBeforeUnmount, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { doesNodeHaveAllCredentialsFilled } from '@/app/utils/nodes/nodeTransforms';

import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { usePostHog } from '@/app/stores/posthog.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';

import { useRoute } from 'vue-router';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const { collapsible = false } = defineProps<{
	collapsible?: boolean;
}>();

const readyToRunStore = useReadyToRunStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const posthogStore = usePostHog();
const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();
const setupPanelStore = useSetupPanelStore();
const i18n = useI18n();
const route = useRoute();

const label = computed(() => i18n.baseText('nodeView.setupTemplate'));

const isTemplateImportRoute = computed(() => {
	return route.query.templateId !== undefined;
});

const isTemplateSetupCompleted = computed(() => {
	return !!workflowDocumentStore?.value?.meta?.templateCredsSetupCompleted;
});

const allCredentialsFilled = computed(() => {
	if (isTemplateSetupCompleted.value) {
		return true;
	}

	// Disabled nodes are skipped during execution, so their unfilled
	// credentials must not keep the setup button visible.
	const nodes = (workflowDocumentStore?.value?.allNodes ?? []).filter((node) => !node.disabled);
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
	const isCreatedFromTemplate = !!workflowDocumentStore?.value?.meta?.templateId;
	if (!isCreatedFromTemplate) {
		return false;
	}

	if (isSetupPanelFeatureEnabled.value) {
		return (workflowDocumentStore?.value?.allNodes ?? []).length > 0 && !allCredentialsFilled.value;
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
		workflowDocumentStore?.value?.addToMeta({
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

const shouldAutoOpenSetup = computed(() => {
	const templateId = workflowDocumentStore?.value?.meta?.templateId;
	return (
		isNewTemplatesSetupEnabled.value &&
		!readyToRunStore.isReadyToRunTemplateId(templateId) &&
		showButton.value &&
		isTemplateImportRoute.value
	);
});

// Auto-open the setup the first time all conditions hold. They may only become
// true after nodes and node types finish loading (an unloaded node type reports
// its credentials as filled), so react to the change rather than sampling once
// on mount. The guard ensures we never re-open once the user closes it.
let hasAutoOpened = false;
watch(
	shouldAutoOpenSetup,
	(shouldOpen) => {
		if (hasAutoOpened || !shouldOpen) return;
		hasAutoOpened = true;
		handleTemplateSetup();
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="showButton" :class="$style.container">
		<N8nButton
			variant="outline"
			:label="label"
			:disabled="isButtonDisabled"
			:class="{ [$style.full]: collapsible }"
			data-test-id="setup-credentials-button"
			size="large"
			icon="package-open"
			@click="handleTemplateSetup()"
		/>
		<N8nTooltip v-if="collapsible" :content="label" placement="bottom">
			<N8nButton
				variant="outline"
				icon-only
				:aria-label="label"
				:disabled="isButtonDisabled"
				:class="$style.compact"
				data-test-id="setup-credentials-button-compact"
				size="large"
				icon="package-open"
				@click="handleTemplateSetup()"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
}

.compact {
	display: none;
}

@container canvas (max-width: 800px) {
	.full {
		display: none;
	}

	.compact {
		display: inline-flex;
	}
}
</style>
