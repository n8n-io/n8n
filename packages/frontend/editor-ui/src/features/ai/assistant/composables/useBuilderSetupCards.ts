import { computed, watch } from 'vue';
import type { INodeParameters } from 'n8n-workflow';

import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { findPlaceholderDetails } from '@/features/ai/assistant/composables/useBuilderTodos';

const MANUAL_TRIGGER_TYPE = 'n8n-nodes-base.manualTrigger';

/**
 * Composable for managing builder setup wizard cards.
 * Feeds placeholder parameter names into useWorkflowSetupState so it creates
 * proper cards, then adds wizard navigation, lazy placeholder clearing,
 * and pinned data auto-strip on top.
 */
export function useBuilderSetupCards() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const nodeHelpers = useNodeHelpers();
	const workflowState = injectWorkflowState();

	// Persistent map of node name → top-level placeholder parameter names.
	// Entries are added when placeholders are first detected and survive lazy clear.
	// Reset when wizard state resets (AI updated the workflow).
	const seenPlaceholderParams = new Map<string, string[]>();

	// Reactive computed that scans all nodes for placeholder parameters,
	// merging with persisted entries so cards survive lazy clear.
	const placeholderParamsByNode = computed(() => {
		const result = new Map<string, string[]>();

		for (const node of workflowsStore.allNodes) {
			if (node.type === MANUAL_TRIGGER_TYPE || node.disabled) continue;

			const placeholders = findPlaceholderDetails(node.parameters);
			if (placeholders.length > 0) {
				const paramNames = [...new Set(placeholders.map((p) => p.path[0]).filter(Boolean))];
				seenPlaceholderParams.set(node.name, paramNames);
			}

			const stored = seenPlaceholderParams.get(node.name);
			if (stored) {
				result.set(node.name, stored);
			}
		}

		return result;
	});

	// Reset persisted placeholder params when wizard state resets
	watch(
		() => builderStore.wizardClearedPlaceholders.size,
		(size) => {
			if (size === 0) {
				seenPlaceholderParams.clear();
			}
		},
	);

	const {
		setupCards: baseCards,
		firstTriggerName,
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

	// Filter out manual trigger cards
	const cards = computed<SetupCardItem[]>(() =>
		baseCards.value.filter((card) => card.state.node.type !== MANUAL_TRIGGER_TYPE),
	);

	const totalCards = computed(() => cards.value.length);

	const currentCard = computed<SetupCardItem | undefined>(
		() => cards.value[currentStepIndex.value],
	);

	const isAllComplete = computed(
		() => cards.value.length === 0 || cards.value.every((card) => card.state.isComplete),
	);

	// Clamp step index when cards array changes
	watch(
		() => cards.value.length,
		(newLength) => {
			if (newLength === 0) {
				currentStepIndex.value = 0;
			} else if (currentStepIndex.value >= newLength) {
				currentStepIndex.value = newLength - 1;
			}
		},
	);

	// Lazy placeholder clearing when a step becomes active
	watch(
		currentStepIndex,
		() => {
			const card = currentCard.value;
			if (!card) return;

			const nodeName = card.state.node.name;
			if (builderStore.wizardClearedPlaceholders.has(nodeName)) return;

			const placeholders = findPlaceholderDetails(card.state.node.parameters);
			if (placeholders.length === 0) return;

			const updatedParams = JSON.parse(
				JSON.stringify(card.state.node.parameters),
			) as INodeParameters;

			for (const placeholder of placeholders) {
				if (placeholder.path.length === 0) continue;
				let target: unknown = updatedParams as unknown;
				for (let i = 0; i < placeholder.path.length - 1; i++) {
					if (target === null || target === undefined || typeof target !== 'object') break;
					const segment = placeholder.path[i];
					const arrayMatch = /^\[(\d+)]$/.exec(segment);
					if (arrayMatch && Array.isArray(target)) {
						target = (target as unknown[])[Number(arrayMatch[1])];
					} else {
						target = (target as Record<string, unknown>)[segment];
					}
				}
				if (target !== null && target !== undefined && typeof target === 'object') {
					const lastKey = placeholder.path[placeholder.path.length - 1];
					const arrayMatch = /^\[(\d+)]$/.exec(lastKey);
					if (arrayMatch && Array.isArray(target)) {
						(target as unknown[])[Number(arrayMatch[1])] = '';
					} else if (lastKey in (target as Record<string, unknown>)) {
						(target as Record<string, unknown>)[lastKey] = '';
					}
				}
			}

			workflowState.updateNodeProperties({
				name: nodeName,
				properties: { parameters: updatedParams },
			});

			builderStore.wizardClearedPlaceholders.add(nodeName);
			nodeHelpers.updateNodesParameterIssues();
		},
		{ immediate: true },
	);

	// Auto-strip pinned data when a card completes
	watch(
		() => cards.value.map((c) => c.state.isComplete),
		(newCompletes, oldCompletes) => {
			if (!oldCompletes) return;

			for (let i = 0; i < newCompletes.length; i++) {
				if (newCompletes[i] && !oldCompletes[i]) {
					const card = cards.value[i];
					if (!card) continue;

					const nodeNames = card.state.allNodesUsingCredential
						? card.state.allNodesUsingCredential.map((n) => n.name)
						: [card.state.node.name];

					const workflowDocumentStore = workflowsStore.workflowId
						? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
						: undefined;

					const unpinnedNodes: string[] = [];
					for (const name of nodeNames) {
						if (workflowDocumentStore?.pinData?.[name]) {
							workflowDocumentStore.unpinNodeData(name);
							if (workflowsStore.nodeMetadata[name]) {
								workflowsStore.nodeMetadata[name].pinnedDataLastRemovedAt = Date.now();
							}
							unpinnedNodes.push(name);
						}
					}

					if (unpinnedNodes.length > 0) {
						uiStore.markStateDirty();
						builderStore.trackWorkflowBuilderJourney('setup_wizard_node_unpinned', {
							unpinned_nodes: unpinnedNodes,
						});
					}
				}
			}
		},
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

	// Auto-advance on card completion (non-last cards).
	// Only auto-advance for cards WITHOUT parameter inputs (credential-only/trigger-only).
	// Cards with parameters require explicit user action (Continue/Skip) because
	// auto-advancing while the user is typing is disruptive.
	let lastWatchedStep = currentStepIndex.value;
	watch(
		() => ({ isComplete: currentCard.value?.state.isComplete, step: currentStepIndex.value }),
		({ isComplete, step }, old) => {
			const stepChanged = step !== lastWatchedStep;
			lastWatchedStep = step;
			if (stepChanged) return;

			if (isComplete && !old?.isComplete && step < cards.value.length - 1) {
				const card = currentCard.value;
				const hasParams = (card?.state.templateParameterNames?.length ?? 0) > 0;
				if (!hasParams) {
					setTimeout(() => goToNext(), 300);
				}
			}
		},
	);

	// Track when all cards are complete
	watch(isAllComplete, (complete, wasComplete) => {
		if (complete && !wasComplete) {
			builderStore.trackWorkflowBuilderJourney('setup_wizard_all_complete', {
				total: totalCards.value,
			});
		}
	});

	return {
		cards,
		currentStepIndex,
		currentCard,
		isAllComplete,
		totalCards,
		firstTriggerName,
		setCredential,
		unsetCredential,
		goToNext,
		goToPrev,
		goToStep,
		continueCurrent,
	};
}
