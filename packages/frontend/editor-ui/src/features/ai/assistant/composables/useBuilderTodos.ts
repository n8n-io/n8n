import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { WorkflowValidationIssue } from '@/Interface';

const PLACEHOLDER_PREFIX = '<__PLACEHOLDER_VALUE__';
const PLACEHOLDER_SUFFIX = '__>';
const PLACEHOLDER_REGEX = /<__PLACEHOLDER_VALUE__(.+?)__>/g;

export interface PlaceholderDetail {
	path: string[];
	label: string;
}

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
 * Extracts all placeholder labels from a string value.
 * Handles both cases where the entire value is a placeholder and where
 * placeholders are embedded within code (e.g., Code node).
 * Returns an array of labels found.
 */
export function extractPlaceholderLabels(value: unknown): string[] {
	if (typeof value !== 'string') return [];

	const labels: string[] = [];
	const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
	let match;

	while ((match = regex.exec(value)) !== null) {
		const label = match[1].trim();
		if (label.length > 0) {
			labels.push(label);
		}
	}

	return labels;
}

/**
 * Recursively searches through a value (object, array, or primitive) to find
 * all placeholder values and their paths.
 */
export function findPlaceholderDetails(value: unknown, path: string[] = []): PlaceholderDetail[] {
	// Check for placeholders in strings (handles both full placeholders and embedded ones)
	if (typeof value === 'string') {
		const labels = extractPlaceholderLabels(value);
		return labels.map((label) => ({ path, label }));
	}

	if (Array.isArray(value)) {
		return value.flatMap((item, index) => findPlaceholderDetails(item, [...path, `[${index}]`]));
	}

	if (value !== null && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, nested]) =>
			findPlaceholderDetails(nested, [...path, key]),
		);
	}

	return [];
}

/**
 * Formats a path array into a dot-notation string for display.
 * Array indices are preserved as [N] without leading dots.
 */
export function formatPlaceholderPath(path: string[]): string {
	if (path.length === 0) return 'parameters';

	return path
		.map((segment, index) => (segment.startsWith('[') || index === 0 ? segment : `.${segment}`))
		.join('');
}

/**
 * Checks if a value is a placeholder value
 */
export function isPlaceholderValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return value.startsWith(PLACEHOLDER_PREFIX) && value.endsWith(PLACEHOLDER_SUFFIX);
}

/**
 * Composable for managing workflow todos (validation issues and placeholders)
 * used by the AI builder.
 */
export function useBuilderTodos() {
	const workflowsStore = useWorkflowsStore();
	const locale = useI18n();

	/**
	 * Base workflow validation issues filtered to only credentials and parameters types.
	 */
	const baseWorkflowIssues = computed(() =>
		workflowsStore.workflowValidationIssues.filter((issue) =>
			['credentials', 'parameters'].includes(issue.type),
		),
	);

	/**
	 * Placeholder issues detected in workflow node parameters.
	 * These are values with the format <__PLACEHOLDER_VALUE__label__>.
	 */
	const placeholderIssues = computed(() => {
		const issues: WorkflowValidationIssue[] = [];
		const seen = new Set<string>();

		for (const node of workflowsStore.workflow.nodes) {
			if (!node?.parameters) continue;

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
				node_type: workflowsStore.getNodeByName(todo.node)?.type,
				label: todo.value,
			})),
		};
	}

	return {
		workflowTodos,
		placeholderIssues,
		getTodosToTrack,
	};
}
