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
 * Build workflow JSON block for Builder
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
 * Build discovery context block for Builder
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
						? ` [Connection params: ${connectionChangingParameters.map((p) => `${p.name}=${p.possibleValues.join('|')}`).join(', ')}]`
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
 * Build execution context block (data + schema) for Builder
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
// MESSAGE BUILDERS
// ============================================================================

/**
 * Create initial context message for a subgraph
 * Filters out empty parts and joins with double newlines
 */
export function createContextMessage(contextParts: string[]): HumanMessage {
	return new HumanMessage({ content: contextParts.filter(Boolean).join('\n\n') });
}
