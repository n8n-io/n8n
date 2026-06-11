<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import NodeSetupCard from '@/features/setupPanel/components/cards/NodeSetupCard.vue';
import NodeGroupSetupCard from '@/features/setupPanel/components/cards/NodeGroupSetupCard.vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { isCardComplete, isNodeGroupCard } from '@/features/setupPanel/setupPanel.utils';
import { sectionHasParameters } from '@/features/setupPanel/composables/useNodeGroupSections';
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
const workflowId = useInjectWorkflowId();
const workflowDocumentStore = injectWorkflowDocumentStore();
const { setupCards, isAllComplete, setCredential, unsetCredential, firstTriggerName } =
	useWorkflowSetupState();

watch(isAllComplete, (allComplete) => {
	if (allComplete) {
		telemetry.track('User completed all setup steps', {
			template_id: workflowDocumentStore?.value?.meta?.templateId,
			workflow_id: workflowId.value,
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
	return setupCards.value.filter((card) => !isCardComplete(card));
});

const cardKey = (card: SetupCardItem): string => {
	if (isNodeGroupCard(card)) {
		return `group-${card.nodeGroup.parentNode.id}`;
	}
	return card.state.credentialType
		? `${card.state.credentialType}-${card.state.node.id}`
		: `${card.state.node.id}`;
};

// --- Expanded state management ---
const expandedStates = reactive<Record<string, boolean>>({});
const prevCompleteStates = new Map<string, boolean>();
/** Cards that have parameters — these require manual collapse (user must interact with them) */
const cardsWithParameters = new Set<string>();
let initialized = false;

const isCardExpanded = (key: string): boolean => expandedStates[key] ?? false;

/** Find the next uncompleted card after a given index */
const findNextUncompleted = (cards: SetupCardItem[], afterIndex: number) =>
	cards.find((c, j) => j > afterIndex && !isCardComplete(c));

const setCardExpanded = (key: string, value: boolean) => {
	expandedStates[key] = value;

	// When a parameter card is manually collapsed and is complete, auto-advance
	if (!value) {
		const cards = setupCards.value;
		const cardIndex = cards.findIndex((c) => cardKey(c) === key);
		const card = cards[cardIndex];
		if (card && isCardComplete(card) && cardsWithParameters.has(key)) {
			const nextUncompleted = findNextUncompleted(cards, cardIndex);
			if (nextUncompleted) {
				expandedStates[cardKey(nextUncompleted)] = true;
			}
		}
	}
};

watch(
	setupCards,
	(cards) => {
		// Track cards that have parameters (persists even after issues resolve).
		// Parameter cards require manual collapse; credential-only cards auto-collapse.
		for (const card of cards) {
			const key = cardKey(card);
			if (cardsWithParameters.has(key)) continue;

			if (isNodeGroupCard(card)) {
				const sections = [
					...(card.nodeGroup.parentState ? [card.nodeGroup.parentState] : []),
					...card.nodeGroup.subnodeCards,
				];
				if (sections.some(sectionHasParameters)) cardsWithParameters.add(key);
			} else {
				if (sectionHasParameters(card.state)) cardsWithParameters.add(key);
			}
		}

		if (!initialized) {
			// On first load, expand the first uncompleted card.
			// Only mark initialized once cards are available — for templates,
			// the first watcher fire may have an empty list before nodes load.
			if (cards.length === 0) return;
			const firstUncompleted = findNextUncompleted(cards, -1);
			if (firstUncompleted) {
				expandedStates[cardKey(firstUncompleted)] = true;
			}
			initialized = true;
		} else {
			// When a new incomplete card appears before the currently expanded card
			// (e.g. template parameters detected after templateId becomes available),
			// shift expansion to it since the user hasn't interacted with any card yet.
			const firstUncompleted = findNextUncompleted(cards, -1);
			if (firstUncompleted && !prevCompleteStates.has(cardKey(firstUncompleted))) {
				const firstExpandedIndex = cards.findIndex((c) => expandedStates[cardKey(c)]);
				const firstUncompletedIndex = cards.indexOf(firstUncompleted);
				if (firstExpandedIndex > firstUncompletedIndex) {
					expandedStates[cardKey(cards[firstExpandedIndex])] = false;
					expandedStates[cardKey(firstUncompleted)] = true;
				}
			}

			// When a card completes, collapse it and auto-expand the next uncompleted card.
			// Skip auto-collapse for cards with parameters — those require manual collapse.
			// Credential-only and trigger-only cards auto-collapse on completion.
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				const key = cardKey(card);
				const wasComplete = prevCompleteStates.get(key) ?? false;

				const cardIsComplete = isCardComplete(card);
				const cardIsAutoApplied = isNodeGroupCard(card)
					? [
							...(card.nodeGroup.parentState ? [card.nodeGroup.parentState] : []),
							...card.nodeGroup.subnodeCards,
						].some((s) => s.isAutoApplied)
					: card.state.isAutoApplied;

				if (cardIsComplete && !wasComplete && !cardsWithParameters.has(key)) {
					expandedStates[key] = false;

					// When auto-applied credentials complete a card, only open the next card
					// if all other cards are already collapsed (don't disrupt user's current work).
					const allOthersCollapsed =
						!cardIsAutoApplied || cards.every((c, j) => j === i || !expandedStates[cardKey(c)]);

					if (allOthersCollapsed) {
						const nextUncompleted = findNextUncompleted(cards, i);
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
			prevCompleteStates.set(cardKey(card), isCardComplete(card));
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
			<template v-for="card in visibleCards" :key="cardKey(card)">
				<NodeGroupSetupCard
					v-if="card.nodeGroup"
					:node-group="card.nodeGroup"
					:expanded="isCardExpanded(cardKey(card))"
					@update:expanded="(val: boolean) => setCardExpanded(cardKey(card), val)"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
				<NodeSetupCard
					v-else
					:state="card.state"
					:first-trigger-name="firstTriggerName"
					:expanded="isCardExpanded(cardKey(card))"
					@update:expanded="(val: boolean) => setCardExpanded(cardKey(card), val)"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
			</template>
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
