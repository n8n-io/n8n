import { computed, nextTick, watch } from 'vue';
import { type INodeParameters, deepCopy } from 'n8n-workflow';

import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import {
	findPlaceholderDetails,
	isFullPlaceholderValue,
} from '@/features/ai/assistant/composables/useBuilderTodos';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';

/** Delay before auto-advancing to the next card after completion (ms) */
const AUTO_ADVANCE_DELAY_MS = 300;

/**
 * Navigates a nested object by path segments (supports array index notation like `[0]`).
 * Returns the parent object and the final key, or undefined if the path is invalid.
 */
function resolveNestedPath(
	root: Record<string, unknown>,
	path: string[],
): { parent: Record<string, unknown> | unknown[]; key: string } | undefined {
	let target: unknown = root;
	for (let i = 0; i < path.length - 1; i++) {
		if (target === null || target === undefined || typeof target !== 'object') return undefined;
		const segment = path[i];
		const arrayMatch = /^\[(\d+)]$/.exec(segment);
		if (arrayMatch && Array.isArray(target)) {
			target = (target as unknown[])[Number(arrayMatch[1])];
		} else {
			target = (target as Record<string, unknown>)[segment];
		}
	}
	if (target === null || target === undefined || typeof target !== 'object') return undefined;
	return { parent: target as Record<string, unknown> | unknown[], key: path[path.length - 1] };
}

/**
 * Reads a value from a parent object/array using the final path key.
 */
function getByKey(parent: Record<string, unknown> | unknown[], key: string): unknown {
	const arrayMatch = /^\[(\d+)]$/.exec(key);
	if (arrayMatch && Array.isArray(parent)) return parent[Number(arrayMatch[1])];
	return (parent as Record<string, unknown>)[key];
}

/**
 * Clears a value in a parent object/array by setting it to empty string.
 */
function clearByKey(parent: Record<string, unknown> | unknown[], key: string): void {
	const value = '';
	const arrayMatch = /^\[(\d+)]$/.exec(key);
	if (arrayMatch && Array.isArray(parent)) {
		parent[Number(arrayMatch[1])] = value;
	} else if (key in (parent as Record<string, unknown>)) {
		(parent as Record<string, unknown>)[key] = value;
	}
}

/**
 * Composable for managing builder setup wizard cards.
 * Feeds placeholder parameter names into useWorkflowSetupState so it creates
 * proper cards, then adds wizard navigation and lazy placeholder clearing on top.
 */
export function useBuilderSetupCards() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
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
			if (node.type === MANUAL_TRIGGER_NODE_TYPE || node.disabled) continue;

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

	// Manual trigger cards are already filtered upstream by useWorkflowSetupState
	const cards = computed<SetupCardItem[]>(() => baseCards.value);

	const totalCards = computed(() => cards.value.length);

	const currentCard = computed<SetupCardItem | undefined>(
		() => cards.value[currentStepIndex.value],
	);

	const isAllComplete = computed(
		() => cards.value.length === 0 || cards.value.every((card) => card.state.isComplete),
	);

	function skipToFirstIncomplete() {
		const current = cards.value[currentStepIndex.value];
		if (!current?.state.isComplete) return;
		const firstIncomplete = cards.value.findIndex((c) => !c.state.isComplete);
		if (firstIncomplete !== -1) {
			currentStepIndex.value = firstIncomplete;
		}
	}

	// Reset persisted placeholder params when wizard state resets.
	// Also skip to the first incomplete card after reset (handles AI
	// updating the workflow without the wizard remounting).
	watch(
		() => builderStore.wizardClearedPlaceholders.size,
		(size) => {
			if (size === 0) {
				seenPlaceholderParams.clear();
				void nextTick(() => skipToFirstIncomplete());
			}
		},
	);

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

			const updatedParams = deepCopy(card.state.node.parameters);

			for (const { path } of placeholders) {
				if (path.length === 0) continue;
				const resolved = resolveNestedPath(updatedParams, path);
				if (!resolved) continue;

				// Only clear fields whose entire value is a placeholder.
				// Mixed-content fields (e.g. code with embedded placeholders) are left intact.
				if (!isFullPlaceholderValue(getByKey(resolved.parent, resolved.key))) continue;
				clearByKey(resolved.parent, resolved.key);
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

	// Auto-advance to the next card when the current one completes (non-last cards).
	// Only for cards WITHOUT parameter inputs (credential-only/trigger-only).
	// Cards with parameters should not auto-advance — the user may still be typing.
	// Those cards advance via explicit "Continue" or "Execute step" actions instead.
	// Also skips when the full workflow has been executed (wizardHasExecutedWorkflow).
	let lastWatchedStep = currentStepIndex.value;
	watch(
		() => ({ isComplete: currentCard.value?.state.isComplete, step: currentStepIndex.value }),
		({ isComplete, step }, old) => {
			const stepChanged = step !== lastWatchedStep;
			lastWatchedStep = step;
			if (stepChanged) return;

			if (isComplete && !old?.isComplete && step < cards.value.length - 1) {
				if (builderStore.wizardHasExecutedWorkflow) return;

				const card = currentCard.value;
				const hasParams =
					(card?.state.additionalParameterNames?.length ?? 0) > 0 ||
					Object.keys(card?.state.parameterIssues ?? {}).length > 0;
				if (!hasParams) {
					setTimeout(() => goToNext(), AUTO_ADVANCE_DELAY_MS);
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
