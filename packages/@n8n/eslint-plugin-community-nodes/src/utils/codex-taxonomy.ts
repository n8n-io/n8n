/**
 * n8n's node-panel filtering logic keys off exact `codex.categories` /
 * `codex.subcategories` string values (see
 * `packages/frontend/editor-ui/src/app/constants/nodeCreator.ts` and its
 * consumers `isAINode` / `filterOutAiNodes` in `nodeCreator.utils.ts` /
 * `useViewStacks.ts`). An unrecognized value doesn't error — it silently
 * misclassifies the node (e.g. hides it from the main "Add node" panel).
 *
 * There is no shared, importable taxonomy this package can depend on (those
 * constants live in the frontend app, which this package cannot reference),
 * so the known values are mirrored here manually. Keep this list in sync with
 * `nodeCreator.ts` and the categories/subcategories actually used across
 * `packages/nodes-base` and `packages/@n8n/nodes-langchain`.
 *
 * `'Marketing & Content'` (not `'Marketing'`) matches the publicly documented
 * category list (docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files)
 * and the allowlist `community-node-tooling`'s review script checks against.
 */
export const KNOWN_CODEX_CATEGORIES: Set<string> = new Set([
	'AI',
	'Analytics',
	'Communication',
	'Core Nodes',
	'Data & Storage',
	'Developer Tools',
	'Development',
	'ECM',
	'Finance & Accounting',
	'HITL',
	'Marketing & Content',
	'Miscellaneous',
	'Productivity',
	'Sales',
	'Utility',
]);

/**
 * Flat union of every known subcategory value across all categories (Core
 * Nodes, HITL, AI). This rule does not enforce that a subcategory is nested
 * under its "correct" category — only that the string itself is recognized.
 */
export const KNOWN_CODEX_SUBCATEGORIES: Set<string> = new Set([
	// Core Nodes
	'Data Transformation',
	'Files',
	'Flow',
	'Helpers',
	'Other Trigger Nodes',
	// HITL
	'Human in the Loop',
	// AI
	'Agents',
	'Chains',
	'Document Loaders',
	'Embeddings',
	'Language Models',
	'Memory',
	'Miscellaneous',
	'Model Context Protocol',
	'Output Parsers',
	'Rerankers',
	'Retrievers',
	'Root Nodes',
	'Text Splitters',
	'Tools',
	'Vector Stores',
]);
