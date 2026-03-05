<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import NodeSetupCard from '@/features/setupPanel/components/cards/NodeSetupCard.vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const props = withDefaults(
	defineProps<{
		showCompleted?: boolean;
	}>(),
	{
		showCompleted: true,
	},
);

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const {
	setupCards,
	isAllComplete,
	setCredential,
	unsetCredential,
	firstTriggerName,
	autoAppliedCredentialIds,
} = useWorkflowSetupState();

watch(isAllComplete, (allComplete) => {
	if (allComplete) {
		telemetry.track('User completed all setup steps', {
			template_id: workflowDocumentStore?.value?.meta?.templateId,
			workflow_id: workflowsStore.workflowId,
		});
	}
});

const onCredentialSelected = (payload: {
	credentialType: string;
	credentialId: string;
	nodeName?: string;
}) => {
	setCredential(payload.credentialType, payload.credentialId, payload.nodeName);
};

const onCredentialDeselected = (payload: { credentialType: string; nodeName?: string }) => {
	unsetCredential(payload.credentialType, payload.nodeName);
};

const visibleCards = computed(() => {
	if (props.showCompleted) return setupCards.value;
	return setupCards.value.filter((card) => !card.state.isComplete);
});

const cardKey = (card: SetupCardItem): string => {
	return card.state.credentialType
		? `${card.state.credentialType}-${card.state.node.id}`
		: `${card.state.node.id}`;
};

// --- Expanded state management ---
const expandedStates = reactive<Record<string, boolean>>({});
const prevCompleteStates = new Map<string, boolean>();
/** Cards that have non-resource-locator parameters (text inputs) — these should not be auto-collapsed */
const cardsWithTextParameters = new Set<string>();
let initialized = false;

const isCardExpanded = (key: string): boolean => expandedStates[key] ?? false;

const setCardExpanded = (key: string, value: boolean) => {
	expandedStates[key] = value;

	// When a text-parameter card is manually collapsed and is complete, auto-advance
	if (!value) {
		const cards = setupCards.value;
		const cardIndex = cards.findIndex((c) => cardKey(c) === key);
		const card = cards[cardIndex];
		if (card?.state.isComplete && cardsWithTextParameters.has(key)) {
			const nextUncompleted = cards.find((c, j) => j > cardIndex && !c.state.isComplete);
			if (nextUncompleted) {
				expandedStates[cardKey(nextUncompleted)] = true;
			}
		}
	}
};

watch(
	setupCards,
	(cards) => {
		// Track cards that have non-resource-locator parameters (persists even after issues resolve).
		// RL-only cards can auto-collapse (selecting from a dropdown is a discrete action).
		for (const card of cards) {
			const key = cardKey(card);
			if (cardsWithTextParameters.has(key)) continue;

			const { node } = card.state;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) continue;

			const templateParamNames = card.state.templateParameterNames ?? [];
			const issueParamNames = Object.keys(card.state.parameterIssues);
			const allParamNames = new Set([...templateParamNames, ...issueParamNames]);

			for (const prop of nodeType.properties) {
				if (allParamNames.has(prop.name) && prop.type !== 'resourceLocator') {
					cardsWithTextParameters.add(key);
					break;
				}
			}
		}

		if (!initialized) {
			// On first load, expand the first uncompleted card
			const firstUncompleted = cards.find((c) => !c.state.isComplete);
			if (firstUncompleted) {
				expandedStates[cardKey(firstUncompleted)] = true;
			}
			initialized = true;
		} else {
			// When a card completes, collapse it and auto-expand the next uncompleted card.
			// Skip auto-collapse for cards with text parameters — those require manual collapse.
			// RL-only and credential-only cards auto-collapse on completion.
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				const key = cardKey(card);
				const wasComplete = prevCompleteStates.get(key) ?? false;

				if (card.state.isComplete && !wasComplete && !cardsWithTextParameters.has(key)) {
					expandedStates[key] = false;

					// When auto-applied credentials complete a card, only open the next card
					// if all other cards are already collapsed (don't disrupt user's current work).
					const wasAutoApplied =
						!!card.state.selectedCredentialId &&
						autoAppliedCredentialIds.value.has(card.state.selectedCredentialId);
					const allOthersCollapsed =
						!wasAutoApplied || cards.every((c, j) => j === i || !expandedStates[cardKey(c)]);

					if (allOthersCollapsed) {
						const nextUncompleted = cards.find((c, j) => j > i && !c.state.isComplete);
						if (nextUncompleted) {
							expandedStates[cardKey(nextUncompleted)] = true;
						}
					}
					break;
				}
			}
		}

		prevCompleteStates.clear();
		for (const card of cards) {
			prevCompleteStates.set(cardKey(card), card.state.isComplete);
		}
	},
	{ deep: true, immediate: true },
);
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-cards-container">
		<div
			v-if="setupCards.length === 0"
			:class="$style['empty-state']"
			data-test-id="setup-cards-empty"
		>
			<N8nIcon icon="list-checks" :class="$style['empty-icon']" :size="24" color="text-base" />
			<div :class="$style['empty-text']">
				<N8nText
					size="medium"
					color="text-base"
					:bold="true"
					data-test-id="setup-cards-empty-heading"
				>
					{{ i18n.baseText('setupPanel.empty.heading') }}
				</N8nText>
				<N8nText size="medium" color="text-light" data-test-id="setup-cards-empty-description">
					{{ i18n.baseText('setupPanel.empty.description') }}
				</N8nText>
			</div>
		</div>
		<div v-else :class="$style['card-list']" data-test-id="setup-cards-list">
			<NodeSetupCard
				v-for="card in visibleCards"
				:key="cardKey(card)"
				:state="card.state"
				:first-trigger-name="firstTriggerName"
				:expanded="isCardExpanded(cardKey(card))"
				@update:expanded="(val: boolean) => setCardExpanded(cardKey(card), val)"
				@credential-selected="onCredentialSelected"
				@credential-deselected="onCredentialDeselected"
			/>
			<div
				v-if="isAllComplete"
				:class="$style['complete-message']"
				data-test-id="setup-cards-complete-message"
			>
				<N8nText size="medium" color="text-base">
					{{ i18n.baseText('setupPanel.everythingConfigured.message') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container,
.card-list {
	display: flex;
	flex: 1;
	flex-direction: column;
	width: 100%;
	gap: var(--spacing--2xs);
}

.empty-state {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.empty-text {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.complete-message {
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	padding: var(--spacing--sm);
}
</style>
