import type { NodePromptConfig } from '../../types/config';

export const DEFAULT_PROMPT_CONFIG: NodePromptConfig = {
	nodeTypePatterns: {
		set: ['n8n-nodes-base.set', 'set'],
		if: ['n8n-nodes-base.if', 'if', 'filter'],
		httpRequest: ['n8n-nodes-base.httpRequest', 'httprequest', 'webhook', 'n8n-nodes-base.webhook'],
		tool: ['Tool', '.tool'],
	},

	parameterKeywords: {
		resourceLocator: [
			'channel',
			'file',
			'page',
			'document',
			'sheet',
			'folder',
			'database',
			'board',
			'list',
			'space',
		],
		textExpressions: ['message', 'text', 'content', 'body', 'description', 'title', 'subject'],
	},

	maxExamples: 3,
	targetTokenBudget: 3000,
};

/**
 * Get node type category for a given node type
 */
export function getNodeTypeCategory(
	nodeType: string,
	config: NodePromptConfig = DEFAULT_PROMPT_CONFIG,
): string | null {
	const lowerType = nodeType.toLowerCase();

	for (const [category, patterns] of Object.entries(config.nodeTypePatterns)) {
		if (patterns.some((pattern) => lowerType.includes(pattern.toLowerCase()))) {
			return category;
		}
	}

	// Special check for tool nodes
	if (nodeType.endsWith('Tool') || nodeType.includes('.tool')) {
		return 'tool';
	}

	return null;
}

/**
 * Check if changes mention resource-related keywords
 */
export function mentionsResourceKeywords(
	changes: string[],
	config: NodePromptConfig = DEFAULT_PROMPT_CONFIG,
): boolean {
	const changesText = changes.join(' ').toLowerCase();
	return config.parameterKeywords.resourceLocator.some((keyword) => changesText.includes(keyword));
}

/**
 * Check if changes mention text/expression-related keywords
 */
export function mentionsTextKeywords(
	changes: string[],
	config: NodePromptConfig = DEFAULT_PROMPT_CONFIG,
): boolean {
	const changesText = changes.join(' ').toLowerCase();
	return config.parameterKeywords.textExpressions.some((keyword) => changesText.includes(keyword));
}
