import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { MAX_AI_RESPONSE_CHARS } from '../constants';
import { mermaidStringify } from '../tools/utils/mermaid.utils';
import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import type { QuestionResponse } from '../types/planning';
import type { SimpleWorkflow } from '../types/workflow';
import type { ChatPayload } from '../workflow-builder-agent';
import { isTriggerNodeType } from './node-helpers';
import { trimWorkflowJSON } from './trim-workflow-context';
import { truncateJson } from './truncate-json';

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

/**
 * Finds all trigger nodes in a workflow
 */
function findTriggerNodes(
	nodes: Array<{ name: string; type: string }>,
): Array<{ name: string; type: string }> {
	return nodes.filter((n) => isTriggerNodeType(n.type));
}

/**
 * Build a comprehensive workflow overview with Mermaid diagram.
 * Includes node connections, types, and parameters for better context.
 * Use this when the responder needs to understand the full workflow structure.
 */
export function buildWorkflowOverview(workflow: SimpleWorkflow): string {
	if (workflow.nodes.length === 0) {
		return 'Empty workflow - ready to build';
	}

	const triggerNodes = findTriggerNodes(workflow.nodes);

	const parts: string[] = ['<workflow_overview>'];

	// Metadata
	parts.push(`Node count: ${workflow.nodes.length}`);
	if (triggerNodes.length === 0) {
		parts.push('Triggers: None');
	} else if (triggerNodes.length === 1) {
		parts.push(`Trigger: ${triggerNodes[0].name} (${triggerNodes[0].type})`);
	} else {
		parts.push(`Triggers (${triggerNodes.length}):`);
		for (const trigger of triggerNodes) {
			parts.push(`  - ${trigger.name} (${trigger.type})`);
		}
	}

	// Mermaid diagram with connections and parameters
	parts.push('');
	const mermaid = mermaidStringify(
		{ workflow },
		{
			includeNodeType: true,
			includeNodeParameters: true,
			includeNodeName: true,
		},
	);
	parts.push(mermaid);

	parts.push('</workflow_overview>');
	return parts.join('\n');
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
 * Extract structured Q&A answers from a HumanMessage's resumeData, if present.
 * Returns null when the message doesn't carry question answers.
 */
function getQuestionAnswers(message: BaseMessage | undefined): QuestionResponse[] | null {
	if (!message) return null;
	const resumeData: unknown = message.additional_kwargs?.resumeData;
	if (!Array.isArray(resumeData) || resumeData.length === 0) return null;
	// Validate the first element looks like a QuestionResponse
	const first = resumeData[0] as Record<string, unknown>;
	if (typeof first !== 'object' || !('question' in first)) return null;
	return resumeData as QuestionResponse[];
}

/**
 * Build conversation context for subgraphs (Builder)
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

	// 4. Check if the last user message contains Q&A answers (from clarification questions).
	// When present, format them as readable Q&A pairs instead of showing the raw JSON
	// "Last AI response" and the generic "Current request: Submit answers".
	const qaAnswers = lastUserMessage ? getQuestionAnswers(lastUserMessage) : null;
	if (qaAnswers && lastUserMessage) {
		appendQAPairs(parts, qaAnswers, humanMessages, lastUserMessage, firstUserMessage);
	} else {
		appendLastExchange(parts, messages, lastUserMessage);
	}

	return parts.join('\n');
}

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format Q&A answers as readable pairs and include the triggering user request. */
function appendQAPairs(
	parts: string[],
	qaAnswers: QuestionResponse[],
	humanMessages: BaseMessage[],
	lastUserMessage: BaseMessage,
	firstUserMessage: BaseMessage | undefined,
): void {
	parts.push('Clarification Q&A:');
	for (const answer of qaAnswers) {
		if (answer.skipped) continue;
		const responseParts: string[] = [];
		if (answer.selectedOptions.length > 0) responseParts.push(answer.selectedOptions.join(', '));
		if (answer.customText?.trim()) responseParts.push(answer.customText.trim());
		const response = responseParts.length > 0 ? responseParts.join(', ') : '(no answer)';
		parts.push(`- Q: ${answer.question}`);
		parts.push(`  A: ${response}`);
	}
	parts.push('');

	// Still show the user's original text request that triggered the questions
	// (the non-resume message before this one, e.g. "also send it to S or T")
	const previousNonResumeMessage = [...humanMessages]
		.reverse()
		.find((msg) => msg !== lastUserMessage && !msg.additional_kwargs?.resumeData);
	if (previousNonResumeMessage && previousNonResumeMessage !== firstUserMessage) {
		const prevContent = getMessageContent(previousNonResumeMessage);
		if (prevContent) {
			parts.push(`Current request: "${prevContent}"`);
		}
	}
}

/** Append "Last AI response" and "Current request" from the raw message history. */
function appendLastExchange(
	parts: string[],
	messages: BaseMessage[],
	lastUserMessage: BaseMessage | undefined,
): void {
	if (!lastUserMessage) return;

	const lastUserIndex = messages.lastIndexOf(lastUserMessage);
	if (lastUserIndex > 0) {
		for (let i = lastUserIndex - 1; i >= 0; i--) {
			if (messages[i] instanceof AIMessage) {
				const aiContent = getMessageContent(messages[i]);
				if (aiContent) {
					const truncatedContent =
						aiContent.length > MAX_AI_RESPONSE_CHARS
							? '...' + aiContent.slice(-MAX_AI_RESPONSE_CHARS)
							: aiContent;
					parts.push(`Last AI response: "${truncatedContent}"`);
					parts.push('');
				}
				break;
			}
		}
	}

	const currentContent = getMessageContent(lastUserMessage);
	if (currentContent) {
		parts.push(`Current request: "${currentContent}"`);
	}
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
		truncateJson(executionData),
		'</execution_data>',
		'',
		'<execution_schema>',
		truncateJson(executionSchema),
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

	return ['<execution_schema>', truncateJson(executionSchema), '</execution_schema>'].join('\n');
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

	// Sum items across all output branches (for Switch, If, Router nodes that output to multiple branches)
	let totalItems = 0;
	for (const branchOutput of mainOutput) {
		totalItems += branchOutput?.length ?? 0;
	}
	return totalItems;
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

	// 3. Detect empty outputs using runData directly (more reliable than executionSchema)
	// A node that ran but produced 0 items across all output branches
	// Only check nodes that have actual execution data (not empty arrays)
	const nodesWithEmptyOutput = runDataNodeNames.filter((nodeName) => {
		const nodeData = runData?.[nodeName];
		// Skip if no execution data or empty execution array (node may not have run)
		if (!nodeData || nodeData.length === 0) return false;
		// Check if node ran but produced 0 items
		const itemCount = countNodeOutputItems(runData, nodeName);
		return itemCount === 0;
	});

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
