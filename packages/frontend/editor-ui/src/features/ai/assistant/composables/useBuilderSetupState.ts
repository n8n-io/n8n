import { computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { findPlaceholderDetails } from './useBuilderTodos';
import { useBuilderTodos } from './useBuilderTodos';

/**
 * Bridges AIWB placeholder detection into the setup panel state model.
 * Scans all workflow nodes for placeholders, maps them to `additionalParameterIssues`,
 * filters out nodes with pinned data, and delegates to `useWorkflowSetupState`.
 */
export function useBuilderSetupState() {
	const workflowsStore = useWorkflowsStore();
	const locale = useI18n();
	const { hasTodosHiddenByPinnedData, nodeHasPinnedData, nodeIsDisabled } = useBuilderTodos();

	/**
	 * Nodes filtered to exclude those with pinned data (AIWB-specific).
	 * Pinned data means the node's output is already defined by the builder,
	 * so it doesn't need setup.
	 */
	const filteredNodes: Ref<INodeUi[]> = computed(() =>
		workflowsStore.allNodes.filter(
			(node) => !nodeHasPinnedData(node.name) && !nodeIsDisabled(node.name),
		),
	);

	/**
	 * Maps placeholder values in node parameters to the `additionalParameterIssues` format
	 * expected by `useWorkflowSetupState`.
	 *
	 * For a path like ["assignments", "assignments", "[0]", "value"],
	 * the top-level parameter name is the first segment: "assignments".
	 */
	const additionalParameterIssues: Ref<Record<string, Record<string, string[]>>> = computed(() => {
		const result: Record<string, Record<string, string[]>> = {};

		for (const node of filteredNodes.value) {
			if (!node?.parameters) continue;

			const placeholders = findPlaceholderDetails(node.parameters);
			if (placeholders.length === 0) continue;

			const nodeIssues: Record<string, string[]> = {};
			for (const placeholder of placeholders) {
				const topLevelParam = placeholder.path[0] ?? 'parameters';
				const message = locale.baseText('aiAssistant.builder.executeMessage.fillParameter', {
					interpolate: { label: placeholder.label },
				});

				if (!nodeIssues[topLevelParam]) {
					nodeIssues[topLevelParam] = [];
				}
				if (!nodeIssues[topLevelParam].includes(message)) {
					nodeIssues[topLevelParam].push(message);
				}
			}

			if (Object.keys(nodeIssues).length > 0) {
				result[node.name] = nodeIssues;
			}
		}

		return result;
	});

	const { setupCards, isAllComplete, setCredential, unsetCredential, firstTriggerName } =
		useWorkflowSetupState(filteredNodes, additionalParameterIssues, {
			excludeTriggerOnlyCards: true,
		});

	return {
		setupCards,
		isAllComplete,
		setCredential,
		unsetCredential,
		firstTriggerName,
		hasTodosHiddenByPinnedData,
	};
}
