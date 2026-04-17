import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { WorkflowValidationIssue } from '@/Interface';
import {
	extractPlaceholderLabels,
	findPlaceholderDetails,
	formatPlaceholderPath,
	isPlaceholderValue,
	type PlaceholderDetail,
} from '@n8n/utils';

export {
	extractPlaceholderLabels,
	findPlaceholderDetails,
	formatPlaceholderPath,
	isPlaceholderValue,
	type PlaceholderDetail,
};

export interface TodoTrackingItem {
	type: string;
	node_type: string | undefined;
	label: string | string[];
}

export interface TodosTrackingPayload {
	credentials_todo_count: number;
	placeholders_todo_count: number;
	todos: TodoTrackingItem[];
}

/**
 * Composable for managing workflow todos (validation issues and placeholders)
 * used by the AI builder.
 */
export function useBuilderTodos() {
	const workflowsStore = useWorkflowsStore();
	const locale = useI18n();

	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);

	/**
	 * Checks if a node is disabled, either directly or through any ancestor node.
	 * Sub-nodes (like AI models) won't execute if their parent node is disabled.
	 * Handles nested sub-nodes by recursively checking up the chain.
	 */
	function nodeIsDisabled(nodeName: string, visited: Set<string> = new Set()): boolean {
		// Prevent infinite loops in case of circular connections
		if (visited.has(nodeName)) {
			return false;
		}
		visited.add(nodeName);

		const node = workflowDocumentStore.value?.getNodeByName(nodeName);

		// Check if node itself is disabled
		if (node?.disabled === true) {
			return true;
		}

		// Check if any parent node (via sub-node connections) is disabled.
		// Sub-nodes output to their parent via non-main connection types (ai_languageModel, ai_tool, etc).
		// Skip "main" connections — those are regular workflow links, not sub-node → parent links.
		const outgoingConnections =
			workflowDocumentStore.value?.outgoingConnectionsByNodeName(nodeName) ?? {};
		for (const connectionType of Object.keys(outgoingConnections)) {
			if (connectionType === 'main') continue;
			const connections = outgoingConnections[connectionType];
			if (connections) {
				for (const connectionGroup of connections) {
					if (!connectionGroup) continue;
					for (const connection of connectionGroup) {
						if (nodeIsDisabled(connection.node, visited)) {
							return true;
						}
					}
				}
			}
		}

		return false;
	}

	/**
	 * Checks if a node has pinned data, either directly or through any ancestor node.
	 * Sub-nodes (like AI models) don't have pinned data themselves, but if any
	 * ancestor node has pinned data, the sub-node's output is already defined.
	 * Handles nested sub-nodes by recursively checking up the chain.
	 */
	function nodeHasPinnedData(nodeName: string, visited: Set<string> = new Set()): boolean {
		// Prevent infinite loops in case of circular connections
		if (visited.has(nodeName)) {
			return false;
		}
		visited.add(nodeName);

		const pinData = workflowDocumentStore.value?.pinData;

		// Check if node has direct pinned data
		if (pinData?.[nodeName]?.length) {
			return true;
		}

		// Check if any parent node (via sub-node connections) has pinned data.
		// Sub-nodes output to their parent via non-main connection types (ai_languageModel, ai_tool, etc).
		// Skip "main" connections — those are regular workflow links, not sub-node → parent links.
		const outgoingConnections =
			workflowDocumentStore.value?.outgoingConnectionsByNodeName(nodeName) ?? {};
		for (const connectionType of Object.keys(outgoingConnections)) {
			if (connectionType === 'main') continue;
			const connections = outgoingConnections[connectionType];
			if (connections) {
				for (const connectionGroup of connections) {
					if (!connectionGroup) continue;
					for (const connection of connectionGroup) {
						if (nodeHasPinnedData(connection.node, visited)) {
							return true;
						}
					}
				}
			}
		}

		return false;
	}

	/**
	 * Base workflow validation issues filtered to only credentials and parameters types.
	 * Excludes issues from nodes that have pinned data or are disabled (including parent disabled).
	 */
	const baseWorkflowIssues = computed(() => {
		// Explicit dependencies to ensure reactivity when parent node state changes.
		// Vue's computed may not track dependencies accessed in recursive helper functions,
		// so we access pinData and nodes here to register them as dependencies.
		const _pinData = workflowDocumentStore.value?.pinData;
		const _nodes = workflowDocumentStore.value?.allNodes;
		void _pinData;
		void _nodes;

		return workflowsStore.workflowValidationIssues.filter(
			(issue) =>
				['credentials', 'parameters'].includes(issue.type) &&
				!nodeHasPinnedData(issue.node) &&
				!nodeIsDisabled(issue.node),
		);
	});

	/**
	 * Placeholder issues detected in workflow node parameters.
	 * These are values with the format <__PLACEHOLDER_VALUE__label__>.
	 * Excludes issues from nodes that have pinned data or are disabled (including parent disabled).
	 */
	const placeholderIssues = computed(() => {
		// Explicit dependency to ensure reactivity when parent node state changes.
		// Vue's computed may not track pinData accessed in recursive helper functions.
		const _pinData = workflowDocumentStore.value?.pinData;
		void _pinData;

		const issues: WorkflowValidationIssue[] = [];
		const seen = new Set<string>();

		for (const node of workflowDocumentStore.value?.allNodes ?? []) {
			if (!node?.parameters) continue;

			// Skip nodes with pinned data - their output is already defined
			if (nodeHasPinnedData(node.name)) continue;

			// Skip disabled nodes - they won't execute
			if (nodeIsDisabled(node.name)) continue;

			const placeholders = findPlaceholderDetails(node.parameters);
			if (placeholders.length === 0) continue;

			const existingParameterIssues = node.issues?.parameters ?? {};

			for (const placeholder of placeholders) {
				const path = formatPlaceholderPath(placeholder.path);
				const message = locale.baseText('aiAssistant.builder.executeMessage.fillParameter', {
					interpolate: { label: placeholder.label },
				});
				const rawMessages = existingParameterIssues[path];
				const existingMessages = rawMessages
					? Array.isArray(rawMessages)
						? rawMessages
						: [rawMessages]
					: [];

				if (existingMessages.includes(message)) continue;

				const key = `${node.name}|${path}|${placeholder.label}`;
				if (seen.has(key)) continue;
				seen.add(key);

				issues.push({
					node: node.name,
					type: 'parameters',
					value: message,
				});
			}
		}

		return issues;
	});

	/**
	 * Combined list of all workflow todos (base issues + placeholder issues).
	 */
	const workflowTodos = computed(() => [...baseWorkflowIssues.value, ...placeholderIssues.value]);

	/**
	 * Checks if there are potential todos that are hidden because nodes have pinned data.
	 * Returns true when workflowTodos is empty but there would be todos without the pin filter.
	 */
	const hasTodosHiddenByPinnedData = computed(() => {
		// If we have visible todos, no need to check
		if (workflowTodos.value.length > 0) return false;

		// Check if any pinned data exists
		const pinData = workflowDocumentStore.value?.pinData;
		if (!pinData || Object.keys(pinData).length === 0) return false;

		// Check base workflow issues that would show if not for pinned data
		const wouldHaveBaseIssues = workflowsStore.workflowValidationIssues.some(
			(issue) =>
				['credentials', 'parameters'].includes(issue.type) &&
				nodeHasPinnedData(issue.node) &&
				!nodeIsDisabled(issue.node),
		);

		if (wouldHaveBaseIssues) return true;

		// Check placeholder issues that would show if not for pinned data
		for (const node of workflowDocumentStore.value?.allNodes ?? []) {
			if (!node?.parameters) continue;
			if (!nodeHasPinnedData(node.name)) continue;
			if (nodeIsDisabled(node.name)) continue;

			const placeholders = findPlaceholderDetails(node.parameters);
			if (placeholders.length > 0) return true;
		}

		return false;
	});

	/**
	 * Returns todos data formatted for telemetry tracking.
	 */
	function getTodosToTrack(): TodosTrackingPayload {
		const credentials_todo_count = workflowsStore.workflowValidationIssues.filter(
			(issue) => issue.type === 'credentials',
		).length;
		const placeholders_todo_count = placeholderIssues.value.length;
		return {
			credentials_todo_count,
			placeholders_todo_count,
			todos: workflowTodos.value.map((todo) => ({
				type: todo.type,
				node_type: workflowDocumentStore.value?.getNodeByName(todo.node)?.type,
				label: todo.value,
			})),
		};
	}

	return {
		workflowTodos,
		placeholderIssues,
		getTodosToTrack,
		hasTodosHiddenByPinnedData,
	};
}
