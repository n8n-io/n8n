// Node categories that have specific colors
export const NODE_CATEGORIES = {
	AI: 'ai',
	TRANSFORM: 'transform',
	FLOW: 'flow',
	CORE: 'core',
	TRIGGER: 'trigger',
	HUMAN_REVIEW: 'human-review',
	UNCATEGORIZED: 'uncategorized',
} as const;

export type NodeCategory = (typeof NODE_CATEGORIES)[keyof typeof NODE_CATEGORIES];

// Mapping from subcategory names to node categories
const SUBCATEGORY_TO_CATEGORY: Record<string, NodeCategory> = {
	// AI subcategories
	Agents: 'ai',
	Chains: 'ai',
	'Language Models': 'ai',
	Memory: 'ai',
	'Output Parsers': 'ai',
	Tools: 'ai',
	'Vector Stores': 'ai',
	Retrievers: 'ai',
	Embeddings: 'ai',
	'Document Loaders': 'ai',
	'Text Splitters': 'ai',
	'Other Tools': 'ai',
	'Root Nodes': 'ai',
	'Model Context Protocol': 'ai',
	Miscellaneous: 'ai',

	// Transform subcategory
	Transform: 'transform',

	// Flow subcategory
	Flow: 'flow',

	// Human review
	'Human in the Loop': 'human-review',

	// Helpers are considered core
	Helpers: 'core',

	// Files are considered core
	Files: 'core',
};

interface NodeTypeWithCodex {
	codex?: {
		subcategories?: Record<string, string[]>;
	};
	group?: string[];
}

/**
 * Derives the node category from the node's codex/description
 */
export function getNodeCategoryFromCodex(
	nodeType: NodeTypeWithCodex | null | undefined,
): NodeCategory {
	if (!nodeType) return 'uncategorized';

	// Check if it's a trigger node
	if (nodeType.group?.includes('trigger')) {
		return 'trigger';
	}

	// Get subcategories from codex
	const subcategories = nodeType.codex?.subcategories;
	if (subcategories) {
		// Check Core Nodes subcategories first (most specific)
		const coreNodeSubcategories = subcategories['Core Nodes'];
		if (coreNodeSubcategories) {
			for (const subcategory of coreNodeSubcategories) {
				const category = SUBCATEGORY_TO_CATEGORY[subcategory];
				if (category) return category;
			}
		}

		// Check all other categories
		for (const [, categorySubcategories] of Object.entries(subcategories)) {
			if (Array.isArray(categorySubcategories)) {
				for (const subcategory of categorySubcategories) {
					const category = SUBCATEGORY_TO_CATEGORY[subcategory];
					if (category) return category;
				}
			}
		}
	}

	// Default to core for unmatched nodes
	return 'core';
}

/**
 * Returns the CSS variable name for a given node category
 */
export function getCategoryColorVar(category: NodeCategory): string {
	return `var(--node-category--color--${category})`;
}

/**
 * Returns the CSS variable for a node's category color based on its codex
 */
export function getNodeCategoryColorVar(nodeType: NodeTypeWithCodex | null | undefined): string {
	const category = getNodeCategoryFromCodex(nodeType);
	return getCategoryColorVar(category);
}
