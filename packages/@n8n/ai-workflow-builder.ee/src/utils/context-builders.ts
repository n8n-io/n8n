import { HumanMessage } from '@langchain/core/messages';

import type { DiscoveryContext } from '../types/discovery-types';
import type { SimpleWorkflow } from '../types/workflow';
import type { ChatPayload } from '../workflow-builder-agent';
import { trimWorkflowJSON } from './trim-workflow-context';

// ============================================================================
// WORKFLOW CONTEXT BUILDERS
// ============================================================================

/**
 * Build workflow summary (just node names, types, counts)
 * For Discovery and Supervisor - they don't need full JSON
 */
export function buildWorkflowSummary(workflow: SimpleWorkflow): string {
	if (workflow.nodes.length === 0) {
		return 'No nodes in workflow';
	}

	const nodeList = workflow.nodes.map((n) => `- ${n.name} (${n.type})`).join('\n');
	return `${workflow.nodes.length} existing nodes:\n${nodeList}`;
}

/**
 * Build workflow JSON block for Builder/Configurator
 */
export function buildWorkflowJsonBlock(workflow: SimpleWorkflow): string {
	const trimmed = trimWorkflowJSON(workflow);
	return [
		'<current_workflow_json>',
		JSON.stringify(trimmed, null, 2),
		'</current_workflow_json>',
		'<note>Large property values may be trimmed. Use get_node_parameter tool for full details.</note>',
	].join('\n');
}

// ============================================================================
// DISCOVERY CONTEXT BUILDERS
// ============================================================================

/**
 * Build discovery context block for Builder/Configurator
 * Includes nodes found, connection parameters, and optionally best practices
 */
export function buildDiscoveryContextBlock(
	discoveryContext: DiscoveryContext | null,
	includeBestPractices = true,
): string {
	if (!discoveryContext) return '';

	const parts: string[] = [];

	if (discoveryContext.nodesFound.length > 0) {
		parts.push('Discovered Nodes:');
		discoveryContext.nodesFound.forEach(
			({ nodeName, version, reasoning, connectionChangingParameters, availableResources }) => {
				const params =
					connectionChangingParameters.length > 0
						? ` [Connection params: ${connectionChangingParameters.map((p) => p.name).join(', ')}]`
						: '';

				// Format resource/operation info clearly to help LLM understand the structure
				// Each resource is listed with its valid operations
				// Filter out __CUSTOM_API_CALL__ as it's not useful for workflow building
				let resourceInfo = '';
				if (availableResources && availableResources.length > 0) {
					const filteredResources = availableResources
						.filter((r) => r.value !== '__CUSTOM_API_CALL__')
						.map((r) => {
							const ops = r.operations
								.filter((o) => o.value !== '__CUSTOM_API_CALL__')
								.map((o) => `"${o.value}"`)
								.join(', ');
							return `    - resource="${r.value}" supports operations: [${ops}]`;
						});

					if (filteredResources.length > 0) {
						resourceInfo = `\n  Available resource/operation combinations:\n${filteredResources.join('\n')}`;
					}
				}

				parts.push(`- ${nodeName} v${version}: ${reasoning}${params}${resourceInfo}`);
			},
		);
	}

	if (includeBestPractices && discoveryContext.bestPractices) {
		parts.push('', 'Best Practices:', discoveryContext.bestPractices);
	}

	return parts.join('\n');
}

// ============================================================================
// EXECUTION CONTEXT BUILDERS
// ============================================================================

/**
 * Build execution context block (data + schema) for Configurator
 * Includes both execution data and schema
 */
export function buildExecutionContextBlock(
	workflowContext: ChatPayload['workflowContext'] | undefined,
): string {
	const executionData = workflowContext?.executionData ?? {};
	const executionSchema = workflowContext?.executionSchema ?? [];

	return [
		'<execution_data>',
		JSON.stringify(executionData, null, 2),
		'</execution_data>',
		'',
		'<execution_schema>',
		JSON.stringify(executionSchema, null, 2),
		'</execution_schema>',
	].join('\n');
}

/**
 * Build execution schema only (for Builder - doesn't need full data)
 */
export function buildExecutionSchemaBlock(
	workflowContext: ChatPayload['workflowContext'] | undefined,
): string {
	const executionSchema = workflowContext?.executionSchema ?? [];

	if (executionSchema.length === 0) return '';

	return [
		'<execution_schema>',
		JSON.stringify(executionSchema, null, 2),
		'</execution_schema>',
	].join('\n');
}

// ============================================================================
// SELECTED NODES CONTEXT BUILDERS
// ============================================================================

/**
 * Build selected nodes context block for agents.
 * This provides context about nodes the user has explicitly selected/focused,
 * enabling deictic resolution ("this node", "it") and focused responses.
 *
 * Note: Only includes additional context (issues, connections) not in currentWorkflow.nodes.
 * Full node details (type, parameters) should be looked up by name in currentWorkflow.nodes.
 */
export function buildSelectedNodesContextBlock(
	workflowContext: ChatPayload['workflowContext'] | undefined,
): string {
	const selectedNodes = workflowContext?.selectedNodes;
	if (!selectedNodes || selectedNodes.length === 0) return '';

	const parts: string[] = [];
	parts.push('<selected_nodes>');
	parts.push('The user has explicitly selected the following node(s) for you to focus on.');
	parts.push(
		'When the user says "this node", "it", "this", or similar deictic references, they refer to these selected nodes.',
	);
	parts.push(
		'Look up full node details (type, parameters) by matching the name in <current_workflow_json>.',
	);
	parts.push('');

	for (const node of selectedNodes) {
		parts.push(`<node name="${escapeXmlAttr(node.name)}">`);

		// Issues/validation errors (additional context not in currentWorkflow)
		if (node.issues && Object.keys(node.issues).length > 0) {
			parts.push('  <issues>');
			for (const [param, issues] of Object.entries(node.issues)) {
				for (const issue of issues) {
					parts.push(
						`    <issue parameter="${escapeXmlAttr(param)}">${escapeXmlContent(issue)}</issue>`,
					);
				}
			}
			parts.push('  </issues>');
		}

		// Connections (pre-resolved node names for convenience)
		if (node.incomingConnections.length > 0) {
			parts.push(
				`  <incoming_connections>${node.incomingConnections.map(escapeXmlContent).join(', ')}</incoming_connections>`,
			);
		}
		if (node.outgoingConnections.length > 0) {
			parts.push(
				`  <outgoing_connections>${node.outgoingConnections.map(escapeXmlContent).join(', ')}</outgoing_connections>`,
			);
		}

		parts.push('</node>');
		parts.push('');
	}

	parts.push('</selected_nodes>');

	return parts.join('\n');
}

/**
 * Build a concise summary of selected nodes for routing decisions.
 * Used by Supervisor to understand user intent without full node details.
 */
export function buildSelectedNodesSummary(
	workflowContext: ChatPayload['workflowContext'] | undefined,
): string {
	const selectedNodes = workflowContext?.selectedNodes;
	if (!selectedNodes || selectedNodes.length === 0) return '';

	const nodeList = selectedNodes.map((n) => `- "${n.name}"`).join('\n');

	const hasIssues = selectedNodes.some((n) => n.issues && Object.keys(n.issues).length > 0);

	let summary = `User has ${selectedNodes.length} node(s) selected:\n${nodeList}`;
	if (hasIssues) {
		summary += '\nNote: Some selected nodes have configuration issues.';
	}

	return summary;
}

/**
 * Escape XML attribute value (replaces quotes, ampersand, less-than, greater-than)
 */
function escapeXmlAttr(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Escape XML content (replaces ampersand, less-than, greater-than)
 */
function escapeXmlContent(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

/**
 * Create initial context message for a subgraph
 * Filters out empty parts and joins with double newlines
 */
export function createContextMessage(contextParts: string[]): HumanMessage {
	return new HumanMessage({ content: contextParts.filter(Boolean).join('\n\n') });
}
