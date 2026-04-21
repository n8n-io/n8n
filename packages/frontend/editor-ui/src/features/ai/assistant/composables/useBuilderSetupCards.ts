import { computed, ref, watch } from 'vue';

import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { isCardComplete } from '@/features/setupPanel/setupPanel.utils';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { findPlaceholderDetails } from '@/features/ai/assistant/composables/useBuilderTodos';

export function useBuilderSetupCards() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);

	// Sticky map of node name → placeholder parameter names.
	// Once a node's placeholders are detected, the entry persists even after the user
	// fills in the values. This prevents the card from reclassifying (nodeStates → credentialTypeStates)
	// when the user types, which would cause card instability and unwanted auto-advance.
	const stickyPlaceholderParams = ref(new Map<string, string[]>());

	// Detect current placeholders (reactive, recomputes when node params change)
	const detectedPlaceholders = computed(() => {
		const result = new Map<string, string[]>();
		for (const node of workflowDocumentStore.value.allNodes) {
			const placeholders = findPlaceholderDetails(node.parameters);
			if (placeholders.length > 0) {
				result.set(node.name, [...new Set(placeholders.map((p) => p.path[0]).filter(Boolean))]);
			}
		}
		return result;
	});

	// Persist detected placeholder params into the sticky map via watcher (not inside computed)
	watch(
		detectedPlaceholders,
		(detected) => {
			for (const [name, params] of detected) {
				stickyPlaceholderParams.value.set(name, params);
			}
		},
		{ immediate: true },
	);

	// Sticky map already accumulates all detected placeholders via the watcher above.
	// Wrapping in a computed ensures downstream consumers react to watcher updates.
	const placeholderParamsByNode = computed(() => stickyPlaceholderParams.value);

	const {
		setupCards: baseCards,
		firstTriggerName,
		isInitialCredentialTestingDone,
		setCredential,
		unsetCredential,
	} = useWorkflowSetupState(undefined, {
		additionalParametersByNode: placeholderParamsByNode,
	});

	// Step index is persisted in builder store
	const currentStepIndex = computed({
		get: () => builderStore.wizardCurrentStep,
		set: (val: number) => {
			builderStore.wizardCurrentStep = val;
		},
	});

	const totalCards = computed(() => baseCards.value.length);

	const currentCard = computed<SetupCardItem | undefined>(
		() => baseCards.value[currentStepIndex.value],
	);

	const isAllComplete = computed(
		() =>
			isInitialCredentialTestingDone.value &&
			(baseCards.value.length === 0 || baseCards.value.every((card) => isCardComplete(card))),
	);

	function skipToFirstIncomplete() {
		const current = baseCards.value[currentStepIndex.value];
		if (!current || !isCardComplete(current)) return;
		const firstIncomplete = baseCards.value.findIndex((c) => !isCardComplete(c));
		if (firstIncomplete !== -1) {
			currentStepIndex.value = firstIncomplete;
		}
	}

	// Clamp step index when cards array changes, and on mount skip to
	// the first incomplete card (handles wizard remounting after AI update
	// with some cards already complete).
	watch(
		() => baseCards.value.length,
		(newLength) => {
			if (newLength === 0) {
				currentStepIndex.value = 0;
				return;
			}
			if (currentStepIndex.value >= newLength) {
				currentStepIndex.value = newLength - 1;
			}
			skipToFirstIncomplete();
		},
		{ immediate: true },
	);

	function goToNext() {
		if (currentStepIndex.value < baseCards.value.length - 1) {
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (currentStepIndex.value > 0) {
			currentStepIndex.value--;
		}
	}

	function goToStep(index: number) {
		currentStepIndex.value = Math.max(0, Math.min(index, baseCards.value.length - 1));
	}

	function continueCurrent() {
		const card = currentCard.value;
		const nodeType = card?.nodeGroup ? card.nodeGroup.parentNode.type : card?.state?.node.type;
		builderStore.trackWorkflowBuilderJourney('setup_wizard_step_completed', {
			step: currentStepIndex.value + 1,
			total: totalCards.value,
			node_type: nodeType,
		});
		goToNext();
	}

	/**
	 * Called when a card's step execution finishes (trigger test or node execution).
	 * Dismisses the wizard when all cards are complete.
	 */
	function onStepExecuted() {
		if (!currentCard.value || !isCardComplete(currentCard.value)) return;
		if (isAllComplete.value && currentStepIndex.value === totalCards.value - 1) {
			builderStore.wizardHasExecutedWorkflow = true;
		} else {
			goToNext();
		}
	}

	// Track when all cards are complete
	watch(isAllComplete, (complete, wasComplete) => {
		if (complete && !wasComplete) {
			builderStore.trackWorkflowBuilderJourney('setup_wizard_all_complete', {
				total: totalCards.value,
			});
		}
	});

	// When initial credential tests finish, re-evaluate: skip past any cards that
	// turned out to be complete, or dismiss the wizard entirely.
	// immediate: true covers the no-credentials case where the value is already true at setup.
	watch(
		isInitialCredentialTestingDone,
		(done) => {
			if (!done) return;
			if (isAllComplete.value) {
				builderStore.wizardHasExecutedWorkflow = true;
			} else {
				skipToFirstIncomplete();
			}
		},
		{ immediate: true },
	);

	return {
		cards: baseCards,
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
		goToStep,
		continueCurrent,
		onStepExecuted,
	};
}
