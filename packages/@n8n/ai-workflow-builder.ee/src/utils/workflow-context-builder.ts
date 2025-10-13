import { trimWorkflowJSON } from './trim-workflow-context';
import type { WorkflowState } from '../workflow-state';
import {
	applyCacheControlMarkers,
	cleanStaleWorkflowContext,
	findUserToolMessageIndices,
} from './cache-control';

/**
 * Agent types that need workflow context
 */
export type AgentContextType =
	| 'supervisor'
	| 'builder'
	| 'configurator'
	| 'discovery'
	| 'responder';

/**
 * Build workflow context string for a specific agent type
 *
 * Different agents need different levels of context:
 * - Responder/Discovery: No context needed (returns empty string)
 * - Supervisor/Builder: Trimmed workflow JSON + execution summary
 * - Configurator: Full context (trimmed workflow + execution data + schemas)
 */
export function buildWorkflowContextForAgent(state: typeof WorkflowState.State): string {
	// Responder and Discovery don't need workflow context
	// if (agentType === 'responder' || agentType === 'discovery') {
	// 	return '';
	// }

	const trimmedWorkflow = trimWorkflowJSON(state.workflowJSON);
	const executionData = state.workflowContext?.executionData ?? {};
	const executionSchema = state.workflowContext?.executionSchema ?? [];

	// Build context sections
	const sections = [
		'',
		'<current_workflow_json>',
		JSON.stringify(trimmedWorkflow, null, 2),
		'</current_workflow_json>',
		'<trimmed_workflow_json_note>',
		'Note: Large property values of the nodes in the workflow JSON above may be trimmed to fit within token limits.',
		'Use get_node_parameter tool to get full details when needed.',
		'</trimmed_workflow_json_note>',
		'',
		'<current_simplified_execution_data>',
		JSON.stringify(executionData, null, 2),
		'</current_simplified_execution_data>',
		'',
		'<current_execution_nodes_schemas>',
		JSON.stringify(executionSchema, null, 2),
		'</current_execution_nodes_schemas>',
	];

	// Add discovery context if available (helps supervisor track iterations)
	if (state.discoveryContext) {
		sections.push(
			'',
			'<discovery_status>',
			`Discovery call count: ${state.discoveryContext.callCount} / 5 (max)`,
			`Last run: ${new Date(state.discoveryContext.lastRun).toISOString()}`,
			state.discoveryContext.callCount >= 5
				? 'WARNING: Discovery limit reached - use your search_nodes tool instead'
				: '',
			'</discovery_status>',
		);
	}

	return sections.join('\n');
}

/**
 * Prepare messages with workflow context and cache control markers
 *
 * This function:
 * 1. Cleans stale workflow context from old messages (mutates in place)
 * 2. Adds current workflow context to the last message (mutates in place)
 * 3. Applies cache control markers for Anthropic's prompt caching (mutates in place)
 *
 * Note: This function mutates the messages array for efficiency.
 * The state reducer will handle creating new message instances.
 */
export function prepareMessagesWithContext(
	messages: typeof WorkflowState.State.messages,
	state: typeof WorkflowState.State,
	applyCacheControl: boolean = true,
): typeof WorkflowState.State.messages {
	const workflowContext = buildWorkflowContextForAgent(state);

	// If no workflow context needed, return messages as-is
	if (!workflowContext) {
		return messages;
	}

	if (!applyCacheControl) {
		// Simple case: just append context to last message
		const lastMsg = messages[messages.length - 1];
		if (lastMsg && typeof lastMsg.content === 'string') {
			lastMsg.content = lastMsg.content + workflowContext;
		}
		return messages;
	}

	// Apply full cache optimization (mutates messages in place)
	const userToolIndices = findUserToolMessageIndices(messages);

	console.log('[prepareMessagesWithContext] Cache control', {
		userToolIndicesCount: userToolIndices.length,
		userToolIndices,
		messageTypes: messages.map((m) => m.constructor.name),
		willInjectContext: userToolIndices.length > 0,
	});

	cleanStaleWorkflowContext(messages, userToolIndices);
	applyCacheControlMarkers(messages, userToolIndices, workflowContext);

	return messages;
}
