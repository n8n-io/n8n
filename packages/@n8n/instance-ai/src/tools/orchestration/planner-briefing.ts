import type { InstanceAiEvent } from '@n8n/api-types';
import { DateTime } from 'luxon';

import type { OrchestrationContext } from '../../types';
import { CREDENTIALS_TOOL_ID } from '../credentials.tool';
import { DATA_TABLES_TOOL_ID } from '../data-tables.tool';
import { ASK_USER_TOOL_ID } from '../shared/ask-user.tool';

/** Number of recent thread messages to include as planner context. */
export const MESSAGE_HISTORY_COUNT = 5;

const RELEVANT_PRIOR_TOOL_NAMES = new Set<string>([
	ASK_USER_TOOL_ID,
	CREDENTIALS_TOOL_ID,
	DATA_TABLES_TOOL_ID,
]);

// ---------------------------------------------------------------------------
// Message history retrieval
// ---------------------------------------------------------------------------

interface FormattedMessage {
	role: 'user' | 'assistant';
	content: string;
}

interface PlannerBriefingContext {
	collectedAnswers: string[];
	discoveredResources: string[];
}

interface ToolObservation {
	toolName: string;
	args: Record<string, unknown>;
	result: unknown;
}

interface CredentialBrief {
	id?: string;
	name: string;
	type: string;
}

interface DataTableBrief {
	id?: string;
	name: string;
}

/** Extract plain text from persisted native memory content. */
function extractTextFromMemoryContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) return extractTextParts(content);
	return '';
}

function extractTextParts(parts: unknown[]): string {
	return parts
		.filter(
			(c): c is { type: 'text'; text: string } =>
				typeof c === 'object' &&
				c !== null &&
				'type' in c &&
				c.type === 'text' &&
				'text' in c &&
				typeof c.text === 'string',
		)
		.map((c) => c.text)
		.join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

function readArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown): string[] {
	return readArray(value).filter((item): item is string => typeof item === 'string');
}

function addUnique(target: string[], seen: Set<string>, value: string | undefined): void {
	if (!value || seen.has(value)) return;
	seen.add(value);
	target.push(value);
}

function summarizeList(values: string[], limit = 10): string {
	const visible = values.slice(0, limit).join(', ');
	const remaining = values.length - limit;
	return remaining > 0 ? `${visible}, and ${remaining} more` : visible;
}

export async function getRecentMessages(
	context: OrchestrationContext,
	count: number,
): Promise<FormattedMessage[]> {
	const messages: FormattedMessage[] = [];

	// Retrieve previously-saved messages from memory.
	if (context.memory) {
		try {
			const history = await context.memory.getMessages(context.threadId, {
				limit: count,
			});

			for (const m of history) {
				if (!('role' in m)) continue;
				const role = m.role;
				const content = extractTextFromMemoryContent(m.content);
				if ((role === 'user' || role === 'assistant') && content.length > 0) {
					messages.push({ role, content });
				}
			}
		} catch {
			// Memory recall failed — continue with just the current message
		}
	}

	// Always append the current in-flight user message (not yet saved to memory)
	if (shouldAppendCurrentUserMessage(messages, context.currentUserMessage)) {
		messages.push({ role: 'user', content: context.currentUserMessage });
	}

	return messages;
}

function shouldAppendCurrentUserMessage(
	messages: FormattedMessage[],
	currentUserMessage?: string,
): currentUserMessage is string {
	const current = currentUserMessage?.trim();
	if (!current) return false;

	const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
	return lastUserMessage?.content.trim() !== current;
}

/**
 * Reconstructs prior planner-relevant tool calls from the event stream.
 *
 * Tool-call and tool-result events are correlated by `toolCallId` so the
 * planner can receive structured context that is not preserved in text-only
 * memory recall, such as ask-user answers and credential selections.
 */
export function getPriorToolObservations(context: OrchestrationContext): ToolObservation[] {
	type MutableToolObservation = Omit<ToolObservation, 'result'> & {
		result: unknown;
		hasResult: boolean;
	};

	const toolCalls = new Map<string, MutableToolObservation>();
	const pendingResults = new Map<string, unknown>();

	for (const event of getPriorToolEvents(context)) {
		if (event.type === 'tool-call') {
			const { toolCallId, toolName, args } = event.payload;
			if (!RELEVANT_PRIOR_TOOL_NAMES.has(toolName)) continue;

			const pendingResult = pendingResults.get(toolCallId);
			toolCalls.set(toolCallId, {
				toolName,
				args,
				result: pendingResult,
				hasResult: pendingResults.has(toolCallId),
			});
			continue;
		}

		if (event.type === 'tool-result') {
			const { toolCallId, result } = event.payload;
			const existing = toolCalls.get(toolCallId);
			if (existing) {
				existing.result = result;
				existing.hasResult = true;
			} else {
				pendingResults.set(toolCallId, result);
			}
		}
	}

	return [...toolCalls.values()]
		.filter((observation) => observation.hasResult)
		.map(({ toolName, args, result }) => ({ toolName, args, result }));
}

/**
 * Returns the events that may contain prior tool context for this planner run.
 *
 * When the run belongs to a message group, all runs in that group are searched
 * so follow-up runs can see choices collected earlier in the same assistant
 * turn. If grouped lookup is unavailable, this falls back to the current run.
 */
function getPriorToolEvents(context: OrchestrationContext): InstanceAiEvent[] {
	if (context.messageGroupId) {
		const runIds = getMessageGroupRunIds(context);
		if (runIds.length > 0) {
			try {
				return context.eventBus.getEventsForRuns(context.threadId, runIds);
			} catch {
				// Fall back to the current run below.
			}
		}
	}

	try {
		return context.eventBus.getEventsForRun(context.threadId, context.runId);
	} catch {
		return [];
	}
}

/**
 * Finds run IDs that belong to the current message group from run-start events.
 *
 * The event bus can fetch events for many run IDs, but the orchestration
 * context only carries the current run ID and message group ID. This bridges
 * those two concepts while keeping the current run as a defensive fallback.
 */
function getMessageGroupRunIds(context: OrchestrationContext): string[] {
	const messageGroupId = context.messageGroupId;
	if (!messageGroupId) return [];

	const runIds = new Set<string>();
	try {
		for (const { event } of context.eventBus.getEventsAfter(context.threadId, 0)) {
			if (event.type === 'run-start' && event.payload.messageGroupId === messageGroupId) {
				runIds.add(event.runId);
			}
		}
	} catch {
		return [context.runId];
	}
	runIds.add(context.runId);

	return [...runIds];
}

/**
 * Converts raw prior tool observations into planner briefing sections.
 *
 * The resulting strings are intentionally short and human-readable because
 * they are embedded directly into the planner prompt under dedicated headings.
 */
export function buildPlannerBriefingContext(
	observations: ToolObservation[],
): PlannerBriefingContext {
	const collectedAnswers: string[] = [];
	const discoveredResources: string[] = [];
	const seenAnswers = new Set<string>();
	const seenResources = new Set<string>();
	const credentialsById = buildCredentialLookup(observations);

	for (const observation of observations) {
		if (observation.toolName === ASK_USER_TOOL_ID) {
			for (const answer of extractAskUserAnswerLines(observation)) {
				addUnique(collectedAnswers, seenAnswers, answer);
			}
			continue;
		}

		if (observation.toolName === CREDENTIALS_TOOL_ID) {
			const action = readString(observation.args.action);
			if (action === 'list') {
				addUnique(discoveredResources, seenResources, summarizeCredentials(observation.result));
			}
			if (action === 'setup') {
				for (const selection of extractCredentialSelectionLines(observation, credentialsById)) {
					addUnique(collectedAnswers, seenAnswers, selection);
				}
			}
			continue;
		}

		if (
			observation.toolName === DATA_TABLES_TOOL_ID &&
			readString(observation.args.action) === 'list'
		) {
			addUnique(discoveredResources, seenResources, summarizeDataTables(observation.result));
		}
	}

	return { collectedAnswers, discoveredResources };
}

/**
 * Builds an ID lookup from prior credential list results.
 *
 * Credential setup results contain selected IDs, so this lets the briefing
 * render stable user-facing names and credential types when a prior list result
 * is available.
 */
function buildCredentialLookup(observations: ToolObservation[]): Map<string, CredentialBrief> {
	const credentialsById = new Map<string, CredentialBrief>();

	for (const observation of observations) {
		if (observation.toolName !== CREDENTIALS_TOOL_ID) continue;
		for (const credential of extractCredentials(observation.result)) {
			if (credential.id) credentialsById.set(credential.id, credential);
		}
	}

	return credentialsById;
}

/**
 * Extracts answered ask-user responses as `question: answer` briefing lines.
 *
 * Skipped or unanswered prompts are ignored, and question text is recovered
 * from tool args when the tool result only includes a question ID.
 */
function extractAskUserAnswerLines(observation: ToolObservation): string[] {
	const result = readRecord(observation.result);
	if (!result || result.answered === false) return [];

	const questionsById = extractQuestionTextById(observation.args);
	const answers = readArray(result.answers);
	const lines: string[] = [];

	for (const answerValue of answers) {
		const answer = readRecord(answerValue);
		if (!answer || answer.skipped === true) continue;

		const questionId = readString(answer.questionId);
		const question =
			readString(answer.question) ?? (questionId ? questionsById.get(questionId) : undefined);
		const selectedOptions = readStringArray(answer.selectedOptions);
		const customText = readString(answer.customText);
		const values = [...selectedOptions, ...(customText ? [customText] : [])];

		if (!question || values.length === 0) continue;
		lines.push(`${question}: ${values.join(', ')}`);
	}

	return lines;
}

/**
 * Maps ask-user question IDs to display text from the original tool args.
 */
function extractQuestionTextById(args: Record<string, unknown>): Map<string, string> {
	const questionsById = new Map<string, string>();

	for (const questionValue of readArray(args.questions)) {
		const question = readRecord(questionValue);
		const id = readString(question?.id);
		const text = readString(question?.question);
		if (id && text) questionsById.set(id, text);
	}

	return questionsById;
}

/**
 * Renders credential setup selections as briefing lines.
 *
 * The setup tool returns a `{ credentialType: credentialId }` map. The optional
 * credential lookup turns those IDs back into names so the planner can avoid
 * asking the user to choose the same credential again.
 */
function extractCredentialSelectionLines(
	observation: ToolObservation,
	credentialsById: Map<string, CredentialBrief>,
): string[] {
	const result = readRecord(observation.result);
	const credentials = readRecord(result?.credentials);
	if (!credentials) return [];

	const lines: string[] = [];
	for (const [credentialType, credentialIdValue] of Object.entries(credentials)) {
		const credentialId = readString(credentialIdValue);
		if (!credentialId) continue;

		const credential = credentialsById.get(credentialId);
		const label = credential
			? `${credential.name} (${credential.type})`
			: `credential ID ${credentialId}`;
		lines.push(`Credential selected for ${credentialType}: ${label}`);
	}

	return lines;
}

/**
 * Summarizes a credentials list result for the briefing.
 */
function summarizeCredentials(result: unknown): string | undefined {
	const credentials = extractCredentials(result);
	if (credentials.length === 0) return undefined;

	return `Credentials available: ${summarizeList(
		credentials.map((credential) => `${credential.name} (${credential.type})`),
	)}`;
}

/**
 * Reads the minimal credential metadata needed by the planner briefing.
 */
function extractCredentials(result: unknown): CredentialBrief[] {
	const record = readRecord(result);
	return readArray(record?.credentials)
		.map(readCredentialBrief)
		.filter((credential): credential is CredentialBrief => credential !== undefined);
}

function readCredentialBrief(value: unknown): CredentialBrief | undefined {
	const record = readRecord(value);
	const name = readString(record?.name);
	const type = readString(record?.type);
	if (!name || !type) return undefined;
	const id = readString(record?.id);

	return {
		name,
		type,
		...(id ? { id } : {}),
	};
}

/**
 * Summarizes a data-tables list result for the briefing.
 */
function summarizeDataTables(result: unknown): string | undefined {
	const tables = extractDataTables(result);
	if (tables.length === 0) return undefined;

	return `Data tables available: ${summarizeList(tables.map((table) => table.name))}`;
}

/**
 * Reads the minimal data-table metadata needed by the planner briefing.
 */
function extractDataTables(result: unknown): DataTableBrief[] {
	const record = readRecord(result);
	return readArray(record?.tables)
		.map(readDataTableBrief)
		.filter((table): table is DataTableBrief => table !== undefined);
}

function readDataTableBrief(value: unknown): DataTableBrief | undefined {
	const record = readRecord(value);
	const name = readString(record?.name);
	if (!name) return undefined;
	const id = readString(record?.id);

	return {
		name,
		...(id ? { id } : {}),
	};
}

/**
 * Formats conversation, time, and already-collected context into the planner goal.
 */
export function formatMessagesForBriefing(
	messages: FormattedMessage[],
	guidance?: string,
	timeZone?: string,
	briefingContext?: PlannerBriefingContext,
): string {
	const parts: string[] = [];

	const now = timeZone ? DateTime.now().setZone(timeZone) : DateTime.now();
	const isoNow = now.toISO({ includeOffset: true }) ?? new Date().toISOString();
	parts.push(`<current-datetime>${isoNow}</current-datetime>`);
	if (timeZone) {
		parts.push(`<user-timezone>${timeZone}</user-timezone>`);
	}

	if (messages.length > 0) {
		parts.push('## Recent conversation');
		for (const m of messages) {
			const label = m.role === 'user' ? 'User' : 'Assistant';
			// Truncate very long messages
			const content = m.content.length > 2000 ? m.content.slice(0, 2000) + '...' : m.content;
			parts.push(`**${label}:** ${content}`);
		}
	}

	if (briefingContext?.collectedAnswers.length) {
		parts.push('## Already-collected answers');
		for (const answer of briefingContext.collectedAnswers) {
			parts.push(`- ${answer}`);
		}
	}

	if (briefingContext?.discoveredResources.length) {
		parts.push('## Already-discovered resources');
		for (const resource of briefingContext.discoveredResources) {
			parts.push(`- ${resource}`);
		}
	}

	if (guidance) {
		parts.push(`\n## Orchestrator guidance\n${guidance}`);
	}

	parts.push('\nDesign the solution blueprint based on the conversation above.');

	return parts.join('\n\n');
}
