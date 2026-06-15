/**
 * Subnode Connection Validator
 *
 * Validates that subnode-only node types are properly connected to parent nodes
 * via the appropriate AI connection type.
 *
 * Subnodes like embeddings, language models, memory, etc. must be connected as
 * subnodes to a parent node (like an agent or chain) - they cannot be used as
 * standalone workflow nodes.
 */

import type { GraphNode } from '../../../types/base';
import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';
import { isAutoRenamed, formatNodeRef } from '../types';

/**
 * Subnode type patterns and their required AI connection types.
 *
 * Some node types are designed to be subnodes only - they must connect
 * TO a parent node via an AI connection, not receive data via 'main' connections.
 *
 * Excluded from validation (can be standalone):
 * - vectorStore* - Can operate in retrieval mode as standalone node
 * - retriever* - Connects to agents, complex usage patterns
 * - tool* - Many tools can work as standalone or subnodes
 * - agent, chain* - These are parent nodes that host subnodes
 */
const SUBNODE_TYPE_PATTERNS: Array<{
	prefix: string;
	connectionType: string;
	subnodeField: string;
}> = [
	{ prefix: 'embeddings', connectionType: 'ai_embedding', subnodeField: 'embedding' },
	{ prefix: 'lm', connectionType: 'ai_languageModel', subnodeField: 'model' },
	{ prefix: 'memory', connectionType: 'ai_memory', subnodeField: 'memory' },
	{ prefix: 'outputParser', connectionType: 'ai_outputParser', subnodeField: 'outputParser' },
	{ prefix: 'document', connectionType: 'ai_document', subnodeField: 'documentLoader' },
	{ prefix: 'textSplitter', connectionType: 'ai_textSplitter', subnodeField: 'textSplitter' },
	{ prefix: 'reranker', connectionType: 'ai_reranker', subnodeField: 'reranker' },
];

/**
 * Get the required AI connection info for subnode-only node types.
 * Returns the expected AI connection type and friendly subnode field name if the node
 * is a subnode-only type, or null if it's a regular node that can be used standalone.
 */
function getRequiredSubnodeInfo(
	nodeType: string,
): { connectionType: string; subnodeField: string } | null {
	// Extract the node name suffix after the package prefix
	// e.g., '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini' -> 'embeddingsGoogleGemini'
	const parts = nodeType.split('.');
	const nodeName = parts.length > 1 ? parts[parts.length - 1] : nodeType;

	for (const pattern of SUBNODE_TYPE_PATTERNS) {
		if (nodeName.startsWith(pattern.prefix)) {
			return { connectionType: pattern.connectionType, subnodeField: pattern.subnodeField };
		}
	}

	return null;
}

/**
 * Check if a node has a specific AI connection type to a parent node.
 */
function hasAiConnectionOfType(graphNode: GraphNode, connectionType: string): boolean {
	const outputMap = graphNode.connections.get(connectionType);
	if (!outputMap) return false;
	for (const targets of outputMap.values()) {
		if (targets.length > 0) {
			return true;
		}
	}
	return false;
}

/**
 * Validator that checks subnode-only types are properly connected.
 *
 * Subnodes like embeddings, language models, memory, output parsers, etc.
 * must be connected to a parent node (agent, chain) via the appropriate
 * AI connection type. They cannot be used as standalone workflow nodes.
 */
export const subnodeConnectionValidator: ValidatorPlugin = {
	id: 'core:subnode-connection',
	name: 'Subnode Connection Validator',
	priority: 20,

	// Per-node validation not used - we do workflow-level validation
	validateNode: () => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		for (const [mapKey, graphNode] of ctx.nodes) {
			const subnodeInfo = getRequiredSubnodeInfo(graphNode.instance.type);
			if (subnodeInfo) {
				// This is a subnode-only type - verify it has the required AI connection
				if (!hasAiConnectionOfType(graphNode, subnodeInfo.connectionType)) {
					const originalName = graphNode.instance.name;
					const renamed = isAutoRenamed(mapKey, originalName);
					const displayName = renamed ? mapKey : originalName;
					const origForDisplay = renamed ? originalName : undefined;
					const nodeRef = formatNodeRef(displayName, origForDisplay, graphNode.instance.type);

					issues.push({
						code: 'SUBNODE_NOT_CONNECTED',
						message: `${nodeRef} is a subnode that must be connected to a parent node as ${subnodeInfo.subnodeField}, but it has no such connection. Use the appropriate subnode factory (e.g., embedding(), languageModel()) and connect it to a parent node's subnodes config.`,
						severity: 'error',
						nodeName: displayName,
						originalName: origForDisplay,
					});
				}
			}
		}

		return issues;
	},
};
