import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import type { CoordinationLogEntry } from '../types/coordination';
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
// CONVERSATION CONTEXT BUILDERS
// ============================================================================

/**
 * Extract the content from a message, handling both string and array formats
 */
function getMessageContent(message: BaseMessage): string {
	if (typeof message.content === 'string') {
		return message.content;
	}
	if (Array.isArray(message.content)) {
		// Extract text from content blocks
		return message.content
			.filter(
				(block): block is { type: 'text'; text: string } =>
					typeof block === 'object' && block !== null && 'type' in block && block.type === 'text',
			)
			.map((block) => block.text)
			.join('\n');
	}
	return '';
}

/**
 * Build conversation context for subgraphs (Builder/Configurator)
 * Provides history so agents understand what happened before the current request
 *
 * @param messages - Full conversation history
 * @param coordinationLog - Log of completed phases
 * @param previousSummary - Summary from conversation compaction (if any)
 * @returns Formatted conversation context string
 */
export function buildConversationContext(
	messages: BaseMessage[],
	coordinationLog: CoordinationLogEntry[],
	previousSummary?: string,
): string {
	const parts: string[] = [];

	// 1. Previous summary (from compaction) - contains earlier conversation context
	if (previousSummary) {
		parts.push('Previous conversation summary:');
		parts.push(previousSummary);
		parts.push('');
	}

	// 2. Extract original user request (first HumanMessage)
	const humanMessages = messages.filter((m) => m instanceof HumanMessage);
	const firstUserMessage = humanMessages[0];
	const lastUserMessage = humanMessages[humanMessages.length - 1];

	// Only show original request if it's different from the current request
	if (firstUserMessage && lastUserMessage && firstUserMessage !== lastUserMessage) {
		const originalContent = getMessageContent(firstUserMessage);
		if (originalContent) {
			parts.push(`Original request: "${originalContent}"`);
			parts.push('');
		}
	}

	// 3. Summarize previous actions from coordination log
	const completedPhases = coordinationLog.filter((e) => e.status === 'completed');
	if (completedPhases.length > 0) {
		parts.push('Previous actions:');
		for (const entry of completedPhases) {
			parts.push(`- ${capitalizeFirst(entry.phase)}: ${entry.summary}`);
		}
		parts.push('');
	}

	// 4. Last AI response (what was offered/said before user's current request)
	// This helps understand what the user is responding to
	if (lastUserMessage) {
		const lastUserIndex = messages.lastIndexOf(lastUserMessage);
		if (lastUserIndex > 0) {
			// Find the AI message right before the last user message
			for (let i = lastUserIndex - 1; i >= 0; i--) {
				if (messages[i] instanceof AIMessage) {
					const aiContent = getMessageContent(messages[i]);
					if (aiContent) {
						// Truncate if too long, keep the most relevant part (usually at the end)
						const maxLength = 500;
						const truncatedContent =
							aiContent.length > maxLength ? '...' + aiContent.slice(-maxLength) : aiContent;
						parts.push(`Last AI response: "${truncatedContent}"`);
						parts.push('');
					}
					break;
				}
			}
		}
	}

	// 5. Current request (last HumanMessage)
	if (lastUserMessage) {
		const currentContent = getMessageContent(lastUserMessage);
		if (currentContent) {
			parts.push(`Current request: "${currentContent}"`);
		}
	}

	return parts.join('\n');
}

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
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

type ExecutionError = NonNullable<
	NonNullable<ChatPayload['workflowContext']>['executionData']
>['error'];

type RunData = NonNullable<NonNullable<ChatPayload['workflowContext']>['executionData']>['runData'];

/**
 * Count output items for a node from runData
 * Returns the number of items in the main output, or 0 if not available
 */
function countNodeOutputItems(runData: RunData, nodeName: string): number {
	const nodeData = runData?.[nodeName];
	if (!nodeData || nodeData.length === 0) return 0;

	// Get the first execution's data (index 0)
	const firstExecution = nodeData[0];
	const mainOutput = firstExecution?.data?.main;

	if (!mainOutput || mainOutput.length === 0) return 0;

	// Count items in the first output connection
	const firstOutputItems = mainOutput[0];
	return firstOutputItems?.length ?? 0;
}

/**
 * Build data flow string showing item counts per node
 * Format: "Node1 (5 items) → Node2 (3 items) → Node3 (0 items)"
 */
function buildDataFlowString(runData: RunData, executedNodeNames: string[]): string {
	if (!runData || executedNodeNames.length === 0) return '';

	const nodeFlows = executedNodeNames.map((nodeName) => {
		const itemCount = countNodeOutputItems(runData, nodeName);
		const itemLabel = itemCount === 1 ? 'item' : 'items';
		return `${nodeName} (${itemCount} ${itemLabel})`;
	});

	return nodeFlows.join(' → ');
}

/**
 * Build error status XML block
 */
function buildErrorStatus(
	error: NonNullable<ExecutionError>,
	lastNodeExecuted: string | undefined,
): string {
	const parts = ['<execution_status>', '  <status>error</status>'];

	if (lastNodeExecuted) {
		parts.push(`  <last_node_executed>${lastNodeExecuted}</last_node_executed>`);
	}

	parts.push('  <error>');
	// Check for node property (exists on NodeOperationError)
	if ('node' in error && error.node) {
		const nodeName = typeof error.node === 'string' ? error.node : error.node.name;
		parts.push(`    <node>${nodeName}</node>`);
	}
	if (error.message) {
		parts.push(`    <message>${error.message}</message>`);
	}
	if (error.description) {
		parts.push(`    <description>${error.description}</description>`);
	}
	parts.push('  </error>');
	parts.push('</execution_status>');

	return parts.join('\n');
}

/**
 * Build issues detected status XML block
 */
function buildIssuesStatus(
	dataFlow: string,
	nodesNotExecuted: string[],
	nodesWithEmptyOutput: string[],
): string {
	const parts = ['<execution_status>', '  <status>issues_detected</status>'];

	if (dataFlow) {
		parts.push(`  <data_flow>${dataFlow}</data_flow>`);
	}

	if (nodesNotExecuted.length > 0) {
		parts.push(`  <nodes_not_executed>${nodesNotExecuted.join(', ')}</nodes_not_executed>`);
	}

	if (nodesWithEmptyOutput.length > 0) {
		parts.push(
			`  <nodes_with_empty_output>${nodesWithEmptyOutput.join(', ')}</nodes_with_empty_output>`,
		);
	}

	parts.push('</execution_status>');
	return parts.join('\n');
}

const NO_EXECUTION_STATUS = [
	'<execution_status>',
	'  <status>no_execution</status>',
	'</execution_status>',
].join('\n');

const SUCCESS_STATUS = [
	'<execution_status>',
	'  <status>success</status>',
	'</execution_status>',
].join('\n');

/**
 * Build simplified execution context (for Supervisor/Responder)
 * Returns a summary of execution status and errors without full data
 *
 * Detects three types of issues:
 * 1. Error - An actual error was thrown during execution
 * 2. Incomplete execution - Some workflow nodes never ran
 * 3. Empty outputs - Nodes ran successfully but produced 0 items
 *
 * @param workflowContext - The workflow context with execution data
 * @param workflowNodes - Optional array of workflow nodes to detect incomplete execution
 */
export function buildSimplifiedExecutionContext(
	workflowContext: ChatPayload['workflowContext'] | undefined,
	workflowNodes?: Array<{ name: string; disabled?: boolean }>,
): string {
	if (!workflowContext) {
		return NO_EXECUTION_STATUS;
	}

	const executionData = workflowContext.executionData;
	const lastNodeExecuted = executionData?.lastNodeExecuted;

	// 1. Check for explicit error (highest priority)
	if (executionData?.error) {
		return buildErrorStatus(executionData.error, lastNodeExecuted);
	}

	// No error - check if we have any run data
	const runData = executionData?.runData ?? {};
	const runDataNodeNames = Object.keys(runData);

	if (runDataNodeNames.length === 0) {
		return NO_EXECUTION_STATUS;
	}

	// 2. Detect incomplete execution - nodes that didn't run
	// Filter out disabled nodes before comparing
	const activeNodeNames = (workflowNodes ?? []).filter((n) => !n.disabled).map((n) => n.name);
	const nodesNotExecuted = activeNodeNames.filter((name) => !runDataNodeNames.includes(name));

	// 3. Detect empty outputs using executionSchema
	// A node with empty value array means it ran but produced no items
	const nodesWithEmptyOutput = (workflowContext.executionSchema ?? [])
		.filter((schema) => {
			const value = schema.schema?.value;
			return Array.isArray(value) && value.length === 0;
		})
		.map((schema) => schema.nodeName);

	// 4. Determine status based on findings
	// Note: nodesNotExecuted may include nodes on branches that weren't taken
	// The LLM will interpret whether this is expected (branching) or unexpected
	if (nodesNotExecuted.length > 0 || nodesWithEmptyOutput.length > 0) {
		// Build data flow showing item counts for executed nodes
		const dataFlow = buildDataFlowString(runData, runDataNodeNames);
		return buildIssuesStatus(dataFlow, nodesNotExecuted, nodesWithEmptyOutput);
	}

	return SUCCESS_STATUS;
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
