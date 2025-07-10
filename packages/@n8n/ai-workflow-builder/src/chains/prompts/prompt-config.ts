/**
 * Configuration for mapping node types to required prompt sections
 */
export interface NodePromptConfig {
	/** Node type patterns that require specific guides */
	nodeTypePatterns: {
		set: string[];
		if: string[];
		httpRequest: string[];
		tool: string[];
	};

	/** Keywords that trigger inclusion of specific guides */
	parameterKeywords: {
		resourceLocator: string[];
		textExpressions: string[];
	};

	/** Maximum number of examples to include */
	maxExamples: number;

	/** Token budget for dynamic sections */
	targetTokenBudget: number;
}

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
 * Advanced configuration for fine-tuning prompt generation
 */
export interface PromptGenerationOptions {
	/** Include examples in the prompt */
	includeExamples?: boolean;

	/** Override the maximum number of examples */
	maxExamples?: number;

	/** Force inclusion of specific guides */
	forceInclude?: {
		setNode?: boolean;
		ifNode?: boolean;
		httpRequest?: boolean;
		toolNodes?: boolean;
		resourceLocator?: boolean;
		textFields?: boolean;
	};

	/** Custom token budget */
	tokenBudget?: number;

	/** Enable verbose logging */
	verbose?: boolean;
}

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
