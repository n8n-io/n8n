import { computed, onMounted, ref, watch } from 'vue';

import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { findPlaceholderDetails } from '@/features/ai/assistant/composables/useBuilderTodos';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';

/**
 * Composable for managing builder setup wizard cards.
 * Feeds placeholder parameter names into useWorkflowSetupState so it creates
 * proper cards, then adds wizard navigation on top.
 */
export function useBuilderSetupCards() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);

	// Sticky map of node name → placeholder parameter names.
	// Once a node's placeholders are detected, the entry persists even after the user
	// fills in the values. This prevents the card from reclassifying (nodeStates → credentialTypeStates)
	// when the user types, which would cause card instability and unwanted auto-advance.
	const stickyPlaceholderParams = ref(new Map<string, string[]>());

	// Detect current placeholders (reactive, recomputes when node params change)
	const detectedPlaceholders = computed(() => {
		const result = new Map<string, string[]>();
		for (const node of workflowDocumentStore.value?.allNodes ?? []) {
			if (node.type === MANUAL_TRIGGER_NODE_TYPE || node.disabled) continue;
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

	// Merge sticky entries with current detections so cards survive after user fills placeholders
	const placeholderParamsByNode = computed(() => {
		// Access detectedPlaceholders to trigger recompute when new placeholders appear
		const current = detectedPlaceholders.value;
		const result = new Map(stickyPlaceholderParams.value);
		// Overlay current detections (they may have updated param names)
		for (const [name, params] of current) {
			result.set(name, params);
		}
		return result;
	});

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

	// Filter out trigger-only cards that don't need any configuration.
	// These cards only require execution to be "complete", which is unnecessary
	// in the builder wizard — the user has nothing to set up on them.
	const cards = computed<SetupCardItem[]>(() =>
		baseCards.value.filter((card) => {
			if (!card.state.isTrigger) return true;
			const hasCredentials = !!card.state.credentialType;
			const hasParameters =
				Object.keys(card.state.parameterIssues).length > 0 ||
				(card.state.additionalParameterNames?.length ?? 0) > 0;
			return hasCredentials || hasParameters;
		}),
	);

	const totalCards = computed(() => cards.value.length);

	const currentCard = computed<SetupCardItem | undefined>(
		() => cards.value[currentStepIndex.value],
	);

	// Credential tests are async — treat pending tests as effectively complete
	// to prevent card flickering while waiting for test results.
	function isCardCompleteForWizard(card: SetupCardItem): boolean {
		if (card.state.isComplete) return true;
		const credId = card.state.selectedCredentialId;
		if (credId && credentialsStore.credentialTestResults.get(credId) === 'pending') {
			return true;
		}
		return false;
	}

	const isAllComplete = computed(
		() => cards.value.length === 0 || cards.value.every(isCardCompleteForWizard),
	);

	function skipToFirstIncomplete() {
		const current = cards.value[currentStepIndex.value];
		if (!current?.state.isComplete) return;
		const firstIncomplete = cards.value.findIndex((c) => !c.state.isComplete);
		if (firstIncomplete !== -1) {
			currentStepIndex.value = firstIncomplete;
		}
	}

	// Clamp step index when cards array changes, and on mount skip to
	// the first incomplete card (handles wizard remounting after AI update
	// with some cards already complete).
	watch(
		() => cards.value.length,
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
		if (currentStepIndex.value < cards.value.length - 1) {
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (currentStepIndex.value > 0) {
			currentStepIndex.value--;
		}
	}

	function goToStep(index: number) {
		currentStepIndex.value = Math.max(0, Math.min(index, cards.value.length - 1));
	}

	function continueCurrent() {
		builderStore.trackWorkflowBuilderJourney('setup_wizard_step_completed', {
			step: currentStepIndex.value + 1,
			total: totalCards.value,
			node_type: currentCard.value?.state.node.type,
		});
		goToNext();
	}

	/**
	 * Called when a card's step execution finishes (trigger test or node execution).
	 * Dismisses the wizard when all cards are complete.
	 */
	function onStepExecuted() {
		if (!currentCard.value?.state.isComplete) return;
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
	watch(isInitialCredentialTestingDone, (done) => {
		if (!done) return;
		if (isAllComplete.value) {
			builderStore.wizardHasExecutedWorkflow = true;
		} else {
			skipToFirstIncomplete();
		}
	});

	onMounted(() => {
		if (isAllComplete.value) {
			// if all cards are completed on mount most likely the builder had made an iteration and there's no more work for the wizard
			builderStore.wizardHasExecutedWorkflow = true;
		}
	});

	return {
		cards,
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
