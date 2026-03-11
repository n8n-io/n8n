// ============================================================================
// IMPORTS
// ============================================================================

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import type { DynamicStructuredTool } from '@langchain/core/tools';

import type {
	HITLInterruptValue,
	PlanInterruptValue,
	QuestionsInterruptValue,
} from '../types/planning';
import type {
	AgentMessageChunk,
	MessagesCompactedChunk,
	PlanChunk,
	QuestionsChunk,
	ToolProgressChunk,
	WorkflowUpdateChunk,
	StreamOutput,
} from '../types/streaming';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BuilderToolBase {
	toolName: string;
	displayTitle: string;
	getCustomDisplayTitle?: (values: Record<string, unknown>) => string;
}

export interface BuilderTool extends BuilderToolBase {
	tool: DynamicStructuredTool;
}

/** Message content structure from LangGraph updates */
type MessageContent = { content: string | Array<{ type: string; text: string }> };

/** Stream event types from LangGraph */
type SubgraphEvent = [string[], string, unknown];
type ParentEvent = [string, unknown];
export type StreamEvent = SubgraphEvent | ParentEvent;

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Tools which should trigger canvas updates */
export const DEFAULT_WORKFLOW_UPDATE_TOOLS = [
	'add_nodes',
	'connect_nodes',
	'update_node_parameters',
	'remove_node',
];

/** Parent graph node that emits user-facing messages */
const EMITTING_NODES = ['responder'];

/** Parent graph nodes to skip entirely (internal coordination) */
const SKIPPED_NODES = [
	'supervisor',
	'tools',
	'cleanup_dangling_tool_calls',
	'create_workflow_name',
	'auto_compact_messages',
	'builder_subgraph',
	'discovery_subgraph',
	'assistant_subgraph',
];

/**
 * Subgraph namespace prefixes that should not emit message events
 * Note: Actual namespaces have UUIDs appended like "builder_subgraph:612f4bc3-..."
 */
const SKIPPED_SUBGRAPH_PREFIXES = ['discovery_subgraph', 'builder_subgraph'];

// ============================================================================
// FILTERING LOGIC
// ============================================================================

/** Check if namespace indicates a skipped subgraph (handles UUID suffixes) */
function isFromSkippedSubgraph(namespace: string[]): boolean {
	return namespace.some((ns) => SKIPPED_SUBGRAPH_PREFIXES.some((prefix) => ns.startsWith(prefix)));
}

/** Check if a node name should be skipped */
function shouldSkipNode(nodeName: string): boolean {
	return SKIPPED_NODES.includes(nodeName);
}

/** Check if a node should emit messages */
function shouldEmitFromNode(nodeName: string): boolean {
	return EMITTING_NODES.includes(nodeName);
}

/** Check if node update contains message data */
function hasMessageInUpdate(update: unknown): boolean {
	const typed = update as { messages?: unknown[] };
	return Array.isArray(typed?.messages) && typed.messages.length > 0;
}

/** Determine if a subgraph update event should be filtered out */
function shouldFilterSubgraphUpdate(namespace: string[], data: Record<string, unknown>): boolean {
	if (!isFromSkippedSubgraph(namespace)) return false;

	return Object.entries(data).some(([nodeName, update]) => {
		if (shouldSkipNode(nodeName)) return false;
		return hasMessageInUpdate(update);
	});
}

/** Type guard for subgraph events */
function isSubgraphEvent(event: unknown): event is SubgraphEvent {
	return Array.isArray(event) && event.length === 3 && Array.isArray(event[0]);
}

/** Type guard for parent events */
function isParentEvent(event: unknown): event is ParentEvent {
	return Array.isArray(event) && event.length === 2 && typeof event[0] === 'string';
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/** Extract message content from a node update */
function extractMessageContent(messages: MessageContent[]): string | null {
	if (messages.length === 0) return null;

	const lastMessage = messages[messages.length - 1];
	if (!lastMessage.content) return null;

	// Handle array content (multi-part messages)
	if (Array.isArray(lastMessage.content)) {
		const textContent = lastMessage.content
			.filter((c) => c.type === 'text')
			.map((c) => c.text)
			.join('\n');
		return textContent || null;
	}

	return lastMessage.content;
}

/**
 * Remove context tags from message content that are used for AI context
 * but shouldn't be displayed to users.
 *
 * Handles multiple formats:
 * 1. Old multi-agent format: <current_workflow_json>...</current_execution_nodes_schemas>
 * 2. Code builder format with <user_request> XML tag
 * 3. Fallback: strips individual context tags
 */
export function cleanContextTags(text: string): string {
	// Handle old multi-agent format
	let cleaned = text.replace(
		/\n*<current_workflow_json>[\s\S]*?<\/current_execution_nodes_schemas>/,
		'',
	);

	// Handle code builder format - extract content from <user_request> tag
	const userRequestMatch = cleaned.match(/<user_request>\n?([\s\S]*?)\n?<\/user_request>/);
	if (userRequestMatch) {
		return userRequestMatch[1].trim();
	}

	// Fallback: strip individual tags if no user request marker found
	cleaned = cleaned.replace(/<conversation_summary>[\s\S]*?<\/conversation_summary>\s*/g, '');
	cleaned = cleaned.replace(/<previous_requests>[\s\S]*?<\/previous_requests>\s*/g, '');
	cleaned = cleaned.replace(/<workflow_file[^>]*>[\s\S]*?<\/workflow_file>\s*/g, '');

	return cleaned.trim();
}

// ============================================================================
// HITL INTERRUPTS
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isQuestionsInterruptValue(value: unknown): value is QuestionsInterruptValue {
	if (!isRecord(value)) return false;
	return value.type === 'questions' && Array.isArray(value.questions);
}

function isPlanInterruptValue(value: unknown): value is PlanInterruptValue {
	if (!isRecord(value)) return false;
	return value.type === 'plan' && isRecord(value.plan);
}

function extractInterruptPayload(
	update: unknown,
): { value: HITLInterruptValue; id?: string } | null {
	if (!isRecord(update)) return null;

	const rawInterrupts = update.__interrupt__;
	if (!isUnknownArray(rawInterrupts) || rawInterrupts.length === 0) return null;

	const first = rawInterrupts[0];
	if (!isRecord(first)) return null;

	const value = first.value;
	if (!isRecord(value)) return null;
	const id = typeof first.id === 'string' ? first.id : undefined;

	if (isQuestionsInterruptValue(value) || isPlanInterruptValue(value)) {
		return { value, id };
	}

	return null;
}

function processInterrupt(interruptValue: HITLInterruptValue, id?: string): StreamOutput {
	if (interruptValue.type === 'questions') {
		const chunk: QuestionsChunk = {
			role: 'assistant',
			type: 'questions',
			introMessage: interruptValue.introMessage,
			questions: interruptValue.questions,
		};
		return { messages: [chunk], ...(id ? { interruptId: id } : {}) };
	}

	const chunk: PlanChunk = {
		role: 'assistant',
		type: 'plan',
		plan: interruptValue.plan,
	};
	return { messages: [chunk], ...(id ? { interruptId: id } : {}) };
}

// ============================================================================
// CHUNK PROCESSORS
// ============================================================================

/** Handle process_operations node update */
function processOperationsUpdate(update: unknown): StreamOutput | null {
	const typed = update as { workflowJSON?: unknown; workflowOperations?: unknown } | undefined;
	if (!typed?.workflowJSON || typed.workflowOperations === undefined) return null;

	const workflowUpdateChunk: WorkflowUpdateChunk = {
		role: 'assistant',
		type: 'workflow-updated',
		codeSnippet: JSON.stringify(typed.workflowJSON, null, 2),
	};
	return { messages: [workflowUpdateChunk] };
}

/** Handle create_workflow_name node update - emits name as workflow update */
function processWorkflowNameUpdate(update: unknown): StreamOutput | null {
	const typed = update as { workflowJSON?: { name?: string } } | undefined;
	if (!typed?.workflowJSON?.name) return null;

	const workflowUpdateChunk: WorkflowUpdateChunk = {
		role: 'assistant',
		type: 'workflow-updated',
		codeSnippet: JSON.stringify(typed.workflowJSON, null, 2),
	};
	return { messages: [workflowUpdateChunk] };
}

/** Handle agent node message update */
function processAgentNodeUpdate(nodeName: string, update: unknown): StreamOutput | null {
	if (!shouldEmitFromNode(nodeName)) return null;

	const typed = update as { messages?: MessageContent[] } | undefined;
	if (!typed?.messages?.length) return null;

	const content = extractMessageContent(typed.messages);
	// Filter out empty content and workflow context artifacts
	if (!content?.trim() || content.includes('<current_workflow_json>')) return null;

	const messageChunk: AgentMessageChunk = {
		role: 'assistant',
		type: 'message',
		text: content,
	};
	return { messages: [messageChunk] };
}

/** Handle custom event chunks (tool progress + assistant messages) */
function processCustomChunk(chunk: unknown): StreamOutput | null {
	if (!chunk || typeof chunk !== 'object') return null;
	const typed = chunk as { type?: string };

	if (typed.type === 'tool') {
		return { messages: [typed as ToolProgressChunk] };
	}

	if (typed.type === 'message' && 'role' in typed && 'text' in typed) {
		return { messages: [typed as AgentMessageChunk] };
	}

	return null;
}

// ============================================================================
// MAIN STREAM PROCESSOR
// ============================================================================

/** Process a single chunk from updates stream mode */
function processUpdatesChunk(nodeUpdate: Record<string, unknown>): StreamOutput | null {
	if (!nodeUpdate || typeof nodeUpdate !== 'object') return null;

	if (nodeUpdate.compact_messages) {
		const compactedChunk: MessagesCompactedChunk = { type: 'messages-compacted' };
		return { messages: [compactedChunk] };
	}

	if (nodeUpdate.delete_messages) {
		return null;
	}

	// Human-in-the-loop interrupts (questions/plan)
	const interruptPayload = extractInterruptPayload(nodeUpdate);
	if (interruptPayload) {
		return processInterrupt(interruptPayload.value, interruptPayload.id);
	}

	// Process operations emits workflow updates
	if (nodeUpdate.process_operations) {
		return processOperationsUpdate(nodeUpdate.process_operations);
	}

	// Workflow name update - emit so frontend receives the generated name
	// before any potential interrupt (e.g., plan mode approval)
	if (nodeUpdate.create_workflow_name) {
		return processWorkflowNameUpdate(nodeUpdate.create_workflow_name);
	}

	// Generic agent node handling
	for (const [nodeName, update] of Object.entries(nodeUpdate)) {
		if (shouldSkipNode(nodeName)) continue;

		const result = processAgentNodeUpdate(nodeName, update);
		if (result) return result;
	}

	return null;
}

/** Process a single chunk from the LangGraph stream */
export function processStreamChunk(streamMode: string, chunk: unknown): StreamOutput | null {
	if (streamMode === 'updates') {
		return processUpdatesChunk(chunk as Record<string, unknown>);
	}

	if (streamMode === 'custom') {
		return processCustomChunk(chunk);
	}

	return null;
}

/** Process a subgraph event */
function processSubgraphEvent(event: SubgraphEvent): StreamOutput | null {
	const [namespace, streamMode, data] = event;

	// Always surface interrupts, even from skipped subgraphs
	if (streamMode === 'updates') {
		const interruptPayload = extractInterruptPayload(data);
		if (interruptPayload) {
			const shouldEmit = namespace.length > 0;
			if (shouldEmit) {
				return processInterrupt(interruptPayload.value, interruptPayload.id);
			}
			return null;
		}
	}

	// Filter out message updates from internal subgraphs
	if (
		streamMode === 'updates' &&
		shouldFilterSubgraphUpdate(namespace, data as Record<string, unknown>)
	) {
		return null;
	}

	return processStreamChunk(streamMode, data);
}

/** Process a parent graph event */
function processParentEvent(event: ParentEvent): StreamOutput | null {
	const [streamMode, chunk] = event;
	if (!streamMode || typeof streamMode !== 'string') return null;

	return processStreamChunk(streamMode, chunk);
}

/** Process a single event from the stream */
function processEvent(event: StreamEvent): StreamOutput | null {
	if (isSubgraphEvent(event)) {
		return processSubgraphEvent(event);
	}

	if (isParentEvent(event)) {
		return processParentEvent(event);
	}

	return null;
}

/**
 * Create a stream processor that yields formatted chunks
 *
 * Handles both regular graph events and subgraph events.
 * - Parent events: [streamMode, data]
 * - Subgraph events: [namespace[], streamMode, data]
 */
export async function* createStreamProcessor(
	stream: AsyncIterable<StreamEvent>,
): AsyncGenerator<StreamOutput> {
	const seenInterruptIds = new Set<string>();
	for await (const event of stream) {
		const result = processEvent(event);
		if (!result) continue;

		if (result.interruptId) {
			if (seenInterruptIds.has(result.interruptId)) {
				continue;
			}
			seenInterruptIds.add(result.interruptId);
		}

		yield result;
	}
}

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

/** Extract text from HumanMessage content (handles string and array formats) */
function extractHumanMessageText(content: HumanMessage['content']): string {
	if (typeof content === 'string') {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.filter(
				(c): c is { type: string; text: string } =>
					typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c,
			)
			.map((c) => c.text)
			.join('\n');
	}

	return '';
}

/** Check if a value is a valid user_answers payload */
function isUserAnswersPayload(value: unknown): value is Array<{
	questionId: string;
	question: string;
	selectedOptions: string[];
	customText?: string;
	skipped?: boolean;
}> {
	if (!Array.isArray(value)) return false;
	return value.every(
		(item) =>
			isRecord(item) &&
			typeof item.questionId === 'string' &&
			typeof item.question === 'string' &&
			Array.isArray(item.selectedOptions),
	);
}

/** Format a HumanMessage into the expected output format */
function formatHumanMessage(msg: HumanMessage): Record<string, unknown> {
	const rawText = extractHumanMessageText(msg.content);
	const cleanedText = cleanContextTags(rawText);

	// Check if this is a user_answers message (structured answers from plan mode)
	const resumeData = msg.additional_kwargs?.resumeData;
	if (isUserAnswersPayload(resumeData)) {
		const result: Record<string, unknown> = {
			role: 'user',
			type: 'user_answers',
			answers: resumeData,
		};

		const messageId = msg.additional_kwargs?.messageId;
		if (typeof messageId === 'string') {
			result.id = messageId;
		}

		return result;
	}

	const result: Record<string, unknown> = {
		role: 'user',
		type: 'message',
		text: cleanedText,
	};

	// Extract versionId from additional_kwargs and expose as revertVersionId
	const versionId = msg.additional_kwargs?.versionId;
	if (typeof versionId === 'string') {
		result.revertVersionId = versionId;
	}

	// Extract messageId from additional_kwargs
	const messageId = msg.additional_kwargs?.messageId;
	if (typeof messageId === 'string') {
		result.id = messageId;
	}

	return result;
}

/** Process array content from AIMessage and return formatted text messages */
function processArrayContent(content: unknown[]): Array<Record<string, unknown>> {
	const textMessages = content.filter(
		(c): c is { type: string; text: string } =>
			typeof c === 'object' && c !== null && 'type' in c && c.type === 'text' && 'text' in c,
	);

	return textMessages.map((textMessage) => ({
		role: 'assistant',
		type: 'message',
		text: textMessage.text,
	}));
}

/** Process AIMessage content and return formatted messages */
function processAIMessageContent(msg: AIMessage): Array<Record<string, unknown>> {
	if (!msg.content) {
		return [];
	}

	if (Array.isArray(msg.content)) {
		return processArrayContent(msg.content);
	}

	return [
		{
			role: 'assistant',
			type: 'message',
			text: msg.content,
		},
	];
}

function tryFormatHitlMessage(msg: AIMessage): Record<string, unknown> | null {
	const messageType = msg.additional_kwargs?.messageType;
	if (messageType !== 'questions' && messageType !== 'plan') return null;
	if (typeof msg.content !== 'string') return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(msg.content);
	} catch {
		return null;
	}

	if (!isRecord(parsed) || parsed.type !== messageType) return null;

	if (messageType === 'questions') {
		const questions = parsed.questions;
		if (!Array.isArray(questions)) return null;
		const introMessage = typeof parsed.introMessage === 'string' ? parsed.introMessage : undefined;
		return {
			role: 'assistant',
			type: 'questions',
			questions,
			...(introMessage ? { introMessage } : {}),
		};
	}

	const plan = parsed.plan;
	if (!isRecord(plan)) return null;
	return {
		role: 'assistant',
		type: 'plan',
		plan,
	};
}

/** Create a formatted tool call message */
function createToolCallMessage(
	toolCall: ToolCall,
	builderTool?: BuilderToolBase,
): Record<string, unknown> {
	return {
		id: toolCall.id,
		toolCallId: toolCall.id,
		role: 'assistant',
		type: 'tool',
		toolName: toolCall.name,
		displayTitle: builderTool?.displayTitle,
		customDisplayTitle: toolCall.args && builderTool?.getCustomDisplayTitle?.(toolCall.args),
		status: 'completed',
		updates: [
			{
				type: 'input',
				data: toolCall.args || {},
			},
		],
	};
}

/** Process tool calls from AIMessage and return formatted tool messages */
function processToolCalls(
	toolCalls: ToolCall[],
	builderTools?: BuilderToolBase[],
): Array<Record<string, unknown>> {
	return toolCalls.map((toolCall) => {
		const builderTool = builderTools?.find((bt) => bt.toolName === toolCall.name);
		return createToolCallMessage(toolCall, builderTool);
	});
}

/** Process a ToolMessage and add its output to the corresponding tool call */
function processToolMessage(
	msg: ToolMessage,
	formattedMessages: Array<Record<string, unknown>>,
): void {
	const toolCallId = msg.tool_call_id;

	// Find the tool message by ID (search backwards for efficiency)
	for (let i = formattedMessages.length - 1; i >= 0; i--) {
		const m = formattedMessages[i];
		if (m.type === 'tool' && m.id === toolCallId) {
			// Add output to updates array
			m.updates ??= [];
			(m.updates as Array<Record<string, unknown>>).push({
				type: 'output',
				data: typeof msg.content === 'string' ? { result: msg.content } : msg.content,
			});
			break;
		}
	}
}

/** Format messages for frontend display */
export function formatMessages(
	messages: Array<AIMessage | HumanMessage | ToolMessage>,
	builderTools?: BuilderToolBase[],
): Array<Record<string, unknown>> {
	const formattedMessages: Array<Record<string, unknown>> = [];

	for (const msg of messages) {
		if (msg instanceof HumanMessage) {
			formattedMessages.push(formatHumanMessage(msg));
		} else if (msg instanceof AIMessage) {
			// Check for HITL messages (questions/plan) from persistence
			const hitlMessage = tryFormatHitlMessage(msg);
			if (hitlMessage) {
				formattedMessages.push(hitlMessage);
				continue;
			}

			// If the message has tool_calls, only process the tool calls.
			// The content in tool-calling messages is intermediate LLM "thinking" text
			// that shouldn't be shown to the user.
			if (msg.tool_calls?.length) {
				formattedMessages.push(...processToolCalls(msg.tool_calls, builderTools));
			} else {
				// No tool calls - this is a final response, include the content
				formattedMessages.push(...processAIMessageContent(msg));
			}
		} else if (msg instanceof ToolMessage) {
			processToolMessage(msg, formattedMessages);
		}
	}

	return formattedMessages;
}
