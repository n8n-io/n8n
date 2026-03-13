<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';

import BuilderSetupCard from './BuilderSetupCard.vue';
import { useBuilderSetupCards } from '@/features/ai/assistant/composables/useBuilderSetupCards';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

const i18n = useI18n();
const builderStore = useBuilderStore();
const setupPanelStore = useSetupPanelStore();

const {
	currentStepIndex,
	currentCard,
	isAllComplete,
	totalCards,
	firstTriggerName,
	setCredential,
	unsetCredential,
	goToNext,
	goToPrev,
	continueCurrent,
	onStepExecuted,
} = useBuilderSetupCards();

const wizardDismissed = computed(
	() => isAllComplete.value && builderStore.wizardHasExecutedWorkflow,
);

const showCard = computed(() => currentCard.value && !wizardDismissed.value);

const showWizard = computed(() => !wizardDismissed.value);

const isHovering = ref(false);

function onMouseEnter() {
	isHovering.value = true;
}

function onMouseLeave() {
	isHovering.value = false;
	setupPanelStore.clearHighlightedNodes();
}

// Highlight all nodes associated with the active card while hovering over the wizard.
const highlightedNodeIds = computed(() => {
	const card = currentCard.value;
	if (!card) return [];
	if (card.state.allNodesUsingCredential?.length) {
		return card.state.allNodesUsingCredential.map((n) => n.id);
	}
	return [card.state.node.id];
});

watch([isHovering, highlightedNodeIds, showWizard], ([hovering, nodeIds, visible]) => {
	if (hovering && nodeIds.length > 0 && visible) {
		setupPanelStore.setHighlightedNodes(nodeIds);
	} else {
		setupPanelStore.clearHighlightedNodes();
	}
});

const descriptionText = computed(() => {
	if (!isAllComplete.value) {
		return i18n.baseText('aiAssistant.builder.executeMessage.description');
	}
	return builderStore.hasTodosHiddenByPinnedData
		? i18n.baseText('aiAssistant.builder.executeMessage.noIssuesWithPinData')
		: i18n.baseText('aiAssistant.builder.executeMessage.noIssues');
});

function onGoToNext() {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_step_navigated', {
		step: currentStepIndex.value + 2,
		total: totalCards.value,
		direction: 'next',
	});
	goToNext();
}

function onGoToPrev() {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_step_navigated', {
		step: currentStepIndex.value,
		total: totalCards.value,
		direction: 'prev',
	});
	goToPrev();
}

function onCredentialSelected(payload: {
	credentialType: string;
	credentialId: string;
	nodeName: string;
}) {
	setCredential(payload.credentialType, payload.credentialId, payload.nodeName);
}

function onCredentialDeselected(payload: { credentialType: string; nodeName: string }) {
	unsetCredential(payload.credentialType, payload.nodeName);
}

function handleStepExecuted() {
	onStepExecuted();
	if (builderStore.wizardHasExecutedWorkflow) {
		setupPanelStore.clearHighlightedNodes();
	}
}

onMounted(() => {
	builderStore.trackWorkflowBuilderJourney('setup_wizard_shown', {
		total: totalCards.value,
	});
});
</script>

<template>
	<div
		v-if="showWizard"
		data-test-id="builder-setup-wizard"
		:class="$style.container"
		role="region"
		aria-label="Workflow setup wizard"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
	>
		<p :class="$style.description">
			{{ descriptionText }}
		</p>

		<BuilderSetupCard
			v-if="showCard"
			:key="currentStepIndex"
			:state="currentCard!.state"
			:step-index="currentStepIndex"
			:total-cards="totalCards"
			:first-trigger-name="firstTriggerName"
			@go-to-next="onGoToNext"
			@go-to-prev="onGoToPrev"
			@step-executed="handleStepExecuted"
			@continue-current="continueCurrent"
			@credential-selected="onCredentialSelected"
			@credential-deselected="onCredentialDeselected"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	line-height: var(--line-height--lg);
	position: relative;
	font-size: var(--font-size--sm);
}

.description {
	margin: 0;
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
}
</style>
