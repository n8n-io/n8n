import type {
	NodeConfigurationEntry,
	NodeConfigurationsMap,
	TemplateNode,
	WorkflowMetadata,
} from '../templates/types';

/**
 * Average character-to-token ratio for Anthropic models.
 * Used for rough token count estimation from character counts.
 */
const AVG_CHARS_PER_TOKEN = 3.5;

/**
 * Maximum characters allowed for a single node example configuration.
 * Examples exceeding this limit are filtered out to avoid context bloat.
 * Based on ~5000 tokens at AVG_CHARS_PER_TOKEN ratio.
 */
const MAX_NODE_EXAMPLE_CHARS = 5000 * AVG_CHARS_PER_TOKEN;

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

/**
 * Collect configuration from a single node if it meets size requirements.
 * Returns null if the node has no parameters or exceeds size limits.
 */
export function collectSingleNodeConfiguration(node: TemplateNode): NodeConfigurationEntry | null {
	const hasParams = Object.keys(node.parameters).length > 0;
	if (!hasParams) return null;

	const parametersStr = JSON.stringify(node.parameters);
	if (parametersStr.length > MAX_NODE_EXAMPLE_CHARS) return null;

	return {
		version: node.typeVersion,
		parameters: node.parameters,
	};
}

/**
 * Add a node configuration to a configurations map.
 * Mutates the map in place for efficiency when processing multiple nodes.
 */
export function addNodeConfigurationToMap(
	nodeType: string,
	config: NodeConfigurationEntry,
	configurationsMap: NodeConfigurationsMap,
): void {
	if (!configurationsMap[nodeType]) {
		configurationsMap[nodeType] = [];
	}
	configurationsMap[nodeType].push(config);
}

/**
 * Collect node configurations from multiple workflows.
 * Skips sticky notes and nodes that exceed size limits.
 */
export function collectNodeConfigurationsFromWorkflows(
	workflows: WorkflowMetadata[],
): NodeConfigurationsMap {
	const configurations: NodeConfigurationsMap = {};

	for (const workflow of workflows) {
		for (const node of workflow.workflow.nodes) {
			// Skip sticky notes
			if (node.type === STICKY_NOTE_TYPE) continue;

			const config = collectSingleNodeConfiguration(node);
			if (config) {
				addNodeConfigurationToMap(node.type, config, configurations);
			}
		}
	}

	return configurations;
}

/**
 * Get node configurations filtered by node type from workflow metadata.
 * Optionally filters by node version as well.
 */
export function getNodeConfigurationsFromTemplates(
	templates: WorkflowMetadata[],
	nodeType: string,
	nodeVersion?: number,
): NodeConfigurationEntry[] {
	const configurations: NodeConfigurationEntry[] = [];

	for (const template of templates) {
		for (const node of template.workflow.nodes) {
			if (node.type !== nodeType) continue;
			if (nodeVersion !== undefined && node.typeVersion !== nodeVersion) continue;

			const config = collectSingleNodeConfiguration(node);
			if (config) {
				configurations.push(config);
			}
		}
	}

	return configurations;
}

/**
 * Format node configuration examples as markdown with character limit.
 */
export function formatNodeConfigurationExamples(
	nodeType: string,
	configurations: NodeConfigurationEntry[],
	nodeVersion?: number,
	maxExamples: number = 1,
	maxChars: number = MAX_NODE_EXAMPLE_CHARS,
): string {
	// Filter by version if specified
	const filtered = nodeVersion
		? configurations.filter((c) => c.version === nodeVersion)
		: configurations;

	if (filtered.length === 0) {
		return `## Node Configuration Examples: ${nodeType}\n\nNo examples found.`;
	}

	// Limit to maxExamples and accumulate within character limit
	const limited = filtered.slice(0, maxExamples);
	const { parts } = limited.reduce<{ parts: string[]; chars: number }>(
		(acc, config) => {
			const exampleStr = JSON.stringify(config.parameters, null, 2);
			if (acc.chars + exampleStr.length <= maxChars) {
				acc.parts.push(
					`### Example (version ${config.version})`,
					'',
					'```json',
					exampleStr,
					'```',
					'',
				);
				acc.chars += exampleStr.length;
			}
			return acc;
		},
		{ parts: [], chars: 0 },
	);

	return [`## Node Configuration Examples: ${nodeType}`, '', ...parts].join('\n');
}
