import { computed, ref, watch } from 'vue';
import type { INodeUi } from '@/Interface';

export interface UseCanvasSearchOptions {
	/** Reactive getter returning the nodes to search over. */
	nodes: () => INodeUi[];
	/**
	 * Resolves a human-readable type label (e.g. "HTTP Request") for a node so it
	 * can be matched alongside the internal node type (e.g. "n8n-nodes-base.httpRequest").
	 */
	resolveTypeLabel?: (node: INodeUi) => string | undefined;
	/** Invoked when navigation (next/previous) moves to a node, with the node's id. */
	onNavigate?: (nodeId: string) => void;
}

/**
 * Recursively collects searchable strings (object keys and primitive values) from
 * a node's parameters so the whole parameter tree can be matched as plain text.
 */
function collectParameterStrings(value: unknown, acc: string[]): void {
	if (value === null || value === undefined) {
		return;
	}

	if (typeof value === 'string') {
		acc.push(value);
	} else if (typeof value === 'number' || typeof value === 'boolean') {
		acc.push(String(value));
	} else if (Array.isArray(value)) {
		for (const item of value) {
			collectParameterStrings(item, acc);
		}
	} else if (typeof value === 'object') {
		for (const [key, val] of Object.entries(value)) {
			acc.push(key);
			collectParameterStrings(val, acc);
		}
	}
}

/**
 * Builds the text blob a node is matched against: its name, its internal type, its
 * display name and the keys/values of all of its parameters, separated by newlines.
 */
export function buildNodeSearchText(node: INodeUi, typeLabel?: string): string {
	const parts: string[] = [node.name, node.type];

	if (typeLabel) {
		parts.push(typeLabel);
	}

	collectParameterStrings(node.parameters, parts);

	return parts.join('\n');
}

/**
 * Cmd+F style search over canvas nodes. Highlights every node whose name, type or
 * parameters match the phrase, with optional regular-expression and case-sensitive
 * matching, and supports cycling through matches.
 */
export function useCanvasSearch(options: UseCanvasSearchOptions) {
	const { nodes, resolveTypeLabel, onNavigate } = options;

	const isOpen = ref(false);
	const query = ref('');
	const caseSensitive = ref(false);
	const useRegex = ref(false);
	/** Index of the current match. Starts at 0 so the first match is auto-selected. */
	const activeMatchIndex = ref(0);
	/** Whether the viewport has been moved to a match yet for the current query. */
	let hasNavigated = false;

	const regexError = computed<string | null>(() => {
		if (!useRegex.value || query.value.length === 0) {
			return null;
		}

		try {
			// eslint-disable-next-line no-new
			new RegExp(query.value);
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : 'Invalid regular expression';
		}
	});

	/**
	 * The predicate used to test a node's searchable text against the current query
	 * and options, or `null` when the query is empty or the regex is invalid.
	 */
	const predicate = computed<((text: string) => boolean) | null>(() => {
		if (query.value.length === 0) {
			return null;
		}

		if (useRegex.value) {
			try {
				// No `g` flag: `RegExp.test` is stateful with it and would skip matches.
				const regex = new RegExp(query.value, caseSensitive.value ? '' : 'i');
				return (text: string) => regex.test(text);
			} catch {
				return null;
			}
		}

		if (caseSensitive.value) {
			const needle = query.value;
			return (text: string) => text.includes(needle);
		}

		const needle = query.value.toLowerCase();
		return (text: string) => text.toLowerCase().includes(needle);
	});

	/** Searchable text per node id, recomputed only when the node list changes. */
	const searchTextByNodeId = computed(() => {
		const map = new Map<string, string>();
		for (const node of nodes()) {
			map.set(node.id, buildNodeSearchText(node, resolveTypeLabel?.(node)));
		}
		return map;
	});

	const matches = computed<INodeUi[]>(() => {
		const test = predicate.value;
		if (!test) {
			return [];
		}

		const textByNodeId = searchTextByNodeId.value;
		return nodes().filter((node) => {
			const text = textByNodeId.get(node.id);
			return text !== undefined && test(text);
		});
	});

	// Empty while closed so highlights clear, but the query is kept for re-opening.
	const matchingNodeIds = computed(() =>
		isOpen.value ? new Set(matches.value.map((node) => node.id)) : new Set<string>(),
	);
	const matchCount = computed(() => matches.value.length);
	const activeMatchNodeId = computed<string | undefined>(() =>
		isOpen.value ? matches.value[activeMatchIndex.value]?.id : undefined,
	);

	/** Whether matches should be highlighted/dimmed on the canvas. */
	const isSearchActive = computed(() => isOpen.value && matchCount.value > 0);

	// Re-select the first match whenever the query or matching options change.
	watch([query, caseSensitive, useRegex], () => {
		activeMatchIndex.value = 0;
		hasNavigated = false;
	});

	// Keep the active index valid if the set of matches shrinks (e.g. node removed).
	watch(matchCount, (count) => {
		if (activeMatchIndex.value >= count) {
			activeMatchIndex.value = count > 0 ? count - 1 : 0;
		}
	});

	function navigateToActive() {
		const nodeId = activeMatchNodeId.value;
		if (nodeId) {
			onNavigate?.(nodeId);
		}
	}

	function goToNext() {
		if (matchCount.value === 0) {
			return;
		}
		// The first navigation only centers the auto-selected match; later ones advance.
		if (hasNavigated) {
			activeMatchIndex.value =
				activeMatchIndex.value >= matchCount.value - 1 ? 0 : activeMatchIndex.value + 1;
		}
		hasNavigated = true;
		navigateToActive();
	}

	function goToPrevious() {
		if (matchCount.value === 0) {
			return;
		}
		if (hasNavigated) {
			activeMatchIndex.value =
				activeMatchIndex.value <= 0 ? matchCount.value - 1 : activeMatchIndex.value - 1;
		}
		hasNavigated = true;
		navigateToActive();
	}

	function open() {
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
		activeMatchIndex.value = 0;
		hasNavigated = false;
	}

	return {
		isOpen,
		query,
		caseSensitive,
		useRegex,
		activeMatchIndex,
		regexError,
		matches,
		matchingNodeIds,
		matchCount,
		activeMatchNodeId,
		isSearchActive,
		open,
		close,
		goToNext,
		goToPrevious,
	};
}
