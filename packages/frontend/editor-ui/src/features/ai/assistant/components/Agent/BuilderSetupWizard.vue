<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import BuilderSetupCard from './BuilderSetupCard.vue';
import BuilderNodeGroupCard from './BuilderNodeGroupCard.vue';
import { useBuilderSetupCards } from '@/features/ai/assistant/composables/useBuilderSetupCards';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { isNodeGroupCard } from '@/features/setupPanel/setupPanel.utils';

const emit = defineEmits<{
	workflowExecuted: [];
	noSetupNeeded: [];
}>();

const i18n = useI18n();
const builderStore = useBuilderStore();
const setupPanelStore = useSetupPanelStore();

const {
	currentStepIndex,
	currentCard,
	isAllComplete,
	isInitialCredentialTestingDone,
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

const isCheckingCredentials = computed(
	() => !isInitialCredentialTestingDone.value && !wizardDismissed.value,
);

const showCard = computed(
	() => currentCard.value && !wizardDismissed.value && isInitialCredentialTestingDone.value,
);

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
// When hovering a specific section inside an agent group, override with that section's nodes.
const sectionHighlightOverride = ref<string[] | null>(null);

function onSectionHighlight(nodeIds: string[] | null) {
	sectionHighlightOverride.value = nodeIds;
	if (isHovering.value && showWizard.value) {
		setupPanelStore.setHighlightedNodes(nodeIds ?? cardHighlightNodeIds.value);
	}
}

const cardHighlightNodeIds = computed(() => {
	const card = currentCard.value;
	if (!card) return [];
	if (isNodeGroupCard(card)) {
		const ids = new Set<string>([card.nodeGroup.parentNode.id]);
		for (const sub of card.nodeGroup.subnodeCards) {
			ids.add(sub.node.id);
		}
		return [...ids];
	}
	if (card.state.allNodesUsingCredential?.length) {
		return card.state.allNodesUsingCredential.map((n) => n.id);
	}
	return [card.state.node.id];
});

const highlightedNodeIds = computed(
	() => sectionHighlightOverride.value ?? cardHighlightNodeIds.value,
);

// Clear section override when navigating to a different card (unmount won't fire mouseleave)
watch(currentCard, () => {
	sectionHighlightOverride.value = null;
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
	return i18n.baseText('aiAssistant.builder.executeMessage.noIssues');
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
		emit('workflowExecuted');
	}
}

const hasTrackedShown = ref(false);
watch(
	showCard,
	(visible) => {
		if (visible && !hasTrackedShown.value) {
			hasTrackedShown.value = true;
			builderStore.trackWorkflowBuilderJourney('setup_wizard_shown', {
				total: totalCards.value,
			});
		}
	},
	{ immediate: true },
);

watch(
	[totalCards, wizardDismissed],
	([count, dismissed]) => {
		// Don't fall back while the builder is still applying the workflow update.
		// setupCards can be transiently empty before the new nodes/connections settle.
		if (count === 0 && !builderStore.getAiBuilderMadeEdits()) return;

		if ((count === 0 || dismissed) && !hasTrackedShown.value) {
			emit('noSetupNeeded');
		}
	},
	{ immediate: true },
);
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
		<N8nText
			v-if="isCheckingCredentials"
			:class="$style.checkingCredentials"
			size="medium"
			color="text-light"
		>
			{{ i18n.baseText('aiAssistant.builder.setupWizard.checkingCredentials' as BaseTextKey) }}
			<N8nIcon icon="chevron-right" size="small" />
		</N8nText>
		<template v-else>
			<N8nText :class="$style.description" size="medium" color="text-dark">
				{{ descriptionText }}
			</N8nText>

			<template v-if="showCard && currentCard">
				<BuilderNodeGroupCard
					v-if="isNodeGroupCard(currentCard)"
					:key="`group-${currentStepIndex}`"
					:node-group="currentCard.nodeGroup"
					:step-index="currentStepIndex"
					:total-cards="totalCards"
					@go-to-next="onGoToNext"
					@go-to-prev="onGoToPrev"
					@step-executed="handleStepExecuted"
					@continue-current="continueCurrent"
					@section-highlight="onSectionHighlight"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
				<BuilderSetupCard
					v-else
					:key="currentStepIndex"
					:state="currentCard.state"
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
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	position: relative;
}

.checkingCredentials {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
