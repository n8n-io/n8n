import type { StreamChunk } from '@n8n/agents';
import {
	credentialRequestSchema,
	workflowSetupNodeSchema,
	taskListSchema,
	plannedTaskArgSchema,
	gatewayConfirmationRequiredPayloadSchema,
	webSearchMetaSchema,
} from '@n8n/api-types';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils';
import { z } from 'zod';

const questionItemSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

function getArrayProperty(record: Record<string, unknown>, key: string): unknown[] | undefined {
	const value = record[key];
	return Array.isArray(value) ? value : undefined;
}

function getRecordProperty(value: unknown, key: string): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	const recordValue = value[key];
	return isRecord(recordValue) ? recordValue : undefined;
}

const DEFAULT_TOOL_ERROR_MESSAGE = 'Tool execution failed';

function tryParseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function extractTextContent(content: unknown[]): string | undefined {
	const text = content
		.flatMap((part) => {
			if (!isRecord(part) || part.type !== 'text') return [];
			const textPart = nonEmptyString(part.text);
			return textPart ? [textPart] : [];
		})
		.join('\n');

	return nonEmptyString(text);
}

function extractToolErrorText(error: unknown): string {
	return extractToolErrorTextInner(error) ?? DEFAULT_TOOL_ERROR_MESSAGE;
}

function extractToolErrorTextInner(error: unknown): string | undefined {
	if (error instanceof Error) return nonEmptyString(error.message);

	if (typeof error === 'string') {
		const parsed = tryParseJson(error);
		if (parsed !== undefined && typeof parsed !== 'string') {
			return extractToolErrorTextInner(parsed) ?? nonEmptyString(error);
		}

		return nonEmptyString(error);
	}

	if (!isRecord(error)) return undefined;

	for (const key of ['error', 'message', 'errorMessage']) {
		const text = nonEmptyString(error[key]);
		if (text) return text;
	}

	const nestedError = getRecordProperty(error, 'error');
	const nestedErrorText = extractToolErrorTextInner(nestedError);
	if (nestedErrorText) return nestedErrorText;

	const structuredContentText = extractToolErrorTextInner(error.structuredContent);
	if (structuredContentText) return structuredContentText;

	const content = getArrayProperty(error, 'content');
	if (content) {
		const contentText = extractTextContent(content);
		if (contentText) return extractToolErrorTextInner(contentText) ?? contentText;
	}

	return extractToolErrorTextInner(error.output);
}

const agentStreamChunkTypes = new Set<string>([
	'finish',
	'text-delta',
	'reasoning-delta',
	'tool-call',
	'tool-result',
	'error',
	'message',
	'tool-call-suspended',
]);

function isAgentStreamChunk(value: unknown): value is StreamChunk {
	return isRecord(value) && typeof value.type === 'string' && agentStreamChunkTypes.has(value.type);
}

interface ErrorInfo {
	content: string;
	statusCode?: number;
	provider?: string;
	technicalDetails?: string;
}

function extractErrorInfo(error: unknown): ErrorInfo {
	if (typeof error === 'string') return { content: error };

	if (error instanceof Error) {
		const info: ErrorInfo = { content: error.message };

		// APICallError from ai-sdk carries statusCode and responseBody
		if ('statusCode' in error && typeof error.statusCode === 'number') {
			info.statusCode = error.statusCode;
		}

		if ('responseBody' in error && typeof error.responseBody === 'string') {
			info.technicalDetails = error.responseBody;
			try {
				const body = JSON.parse(error.responseBody) as {
					error?: { message?: string; type?: string };
				};
				if (body?.error?.message) {
					info.content = body.error.message;
				}
			} catch {
				// not JSON — keep raw responseBody as technicalDetails
			}
		}

		// Extract provider from error name or URL if available
		if ('url' in error && typeof error.url === 'string') {
			const urlStr = error.url;
			if (urlStr.includes('anthropic')) info.provider = 'Anthropic';
			else if (urlStr.includes('openai')) info.provider = 'OpenAI';
		}

		return info;
	}

	return { content: 'Unknown error' };
}

type EventBase = { runId: string; agentId: string; responseId?: string };

type ConfirmationInputType =
	| 'approval'
	| 'text'
	| 'questions'
	| 'plan-review'
	| 'resource-decision'
	| 'continue';

/** A non-empty string, or undefined for anything else (matches the legacy `value ? value : undefined` gate). */
function presentString(value: unknown): string | undefined {
	return typeof value === 'string' && value ? value : undefined;
}

function parseSchemaArray<T>(value: unknown, schema: z.ZodType<T>): T[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const parsed = value
		.map((item) => schema.safeParse(item))
		.filter((r) => r.success)
		.map((r) => r.data);
	return parsed.length > 0 ? parsed : undefined;
}

function parseSchemaRecord<T>(value: unknown, schema: z.ZodType<T>): T | undefined {
	if (!isRecord(value)) return undefined;
	const parsed = schema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

function parseSeverity(value: unknown): 'destructive' | 'warning' | 'info' {
	const raw = typeof value === 'string' ? value : '';
	const valid = ['destructive', 'warning', 'info'] as const;
	return (valid as readonly string[]).includes(raw) ? (raw as (typeof valid)[number]) : 'warning';
}

function parseInputType(value: unknown): ConfirmationInputType | undefined {
	const raw = typeof value === 'string' ? value : undefined;
	const valid = [
		'approval',
		'text',
		'questions',
		'plan-review',
		'resource-decision',
		'continue',
	] as const;
	return (valid as readonly string[]).includes(raw ?? '')
		? (raw as (typeof valid)[number])
		: undefined;
}

function parseDomainAccess(value: unknown): { url: string; host: string } | undefined {
	const raw = isRecord(value) ? value : undefined;
	return raw && typeof raw.url === 'string' && typeof raw.host === 'string'
		? { url: raw.url, host: raw.host }
		: undefined;
}

function parseCredentialFlow(value: unknown): { stage: 'generic' | 'finalize' } | undefined {
	const raw = isRecord(value) ? value : undefined;
	const validStages = new Set<'generic' | 'finalize'>(['generic', 'finalize']);
	const stage = raw && typeof raw.stage === 'string' ? raw.stage : undefined;
	return stage !== undefined && validStages.has(stage as 'generic' | 'finalize')
		? { stage: stage as 'generic' | 'finalize' }
		: undefined;
}

function mapToolCallChunk(
	chunk: Extract<StreamChunk, { type: 'tool-call' }>,
	base: EventBase,
): InstanceAiEvent {
	return {
		type: 'tool-call',
		...base,
		payload: {
			toolCallId: chunk.toolCallId,
			toolName: chunk.toolName,
			args: isRecord(chunk.input) ? chunk.input : {},
		},
	};
}

function mapToolResultChunk(
	chunk: Extract<StreamChunk, { type: 'tool-result' }>,
	base: EventBase,
): InstanceAiEvent {
	if (chunk.isError === true) {
		return {
			type: 'tool-error',
			...base,
			payload: { toolCallId: chunk.toolCallId, error: extractToolErrorText(chunk.output) },
		};
	}

	return {
		type: 'tool-result',
		...base,
		payload: { toolCallId: chunk.toolCallId, result: chunk.output },
	};
}

function mapSuspendedChunk(
	chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
	base: EventBase,
): InstanceAiEvent | null {
	const suspendPayload = isRecord(chunk.suspendPayload) ? chunk.suspendPayload : {};
	const toolCallId = typeof chunk.toolCallId === 'string' ? chunk.toolCallId : '';
	const requestId =
		typeof suspendPayload.requestId === 'string' && suspendPayload.requestId
			? suspendPayload.requestId
			: toolCallId;

	if (!requestId || !toolCallId) return null;

	const credentialRequests = parseSchemaArray(
		suspendPayload.credentialRequests,
		credentialRequestSchema,
	);
	const projectId = presentString(suspendPayload.projectId);
	const inputType = parseInputType(suspendPayload.inputType);
	const questions = parseSchemaArray(suspendPayload.questions, questionItemSchema);
	const introMessage = presentString(suspendPayload.introMessage);
	const tasks = parseSchemaRecord(suspendPayload.tasks, taskListSchema);
	const planItems = parseSchemaArray(suspendPayload.planItems, plannedTaskArgSchema);
	const domainAccess = parseDomainAccess(suspendPayload.domainAccess);
	const webSearch = parseSchemaRecord(suspendPayload.webSearch, webSearchMetaSchema);
	const credentialFlow = parseCredentialFlow(suspendPayload.credentialFlow);
	const setupRequests = parseSchemaArray(suspendPayload.setupRequests, workflowSetupNodeSchema);
	const workflowId = presentString(suspendPayload.workflowId);
	const resourceDecision = parseSchemaRecord(
		suspendPayload.resourceDecision,
		gatewayConfirmationRequiredPayloadSchema,
	);

	return {
		type: 'confirmation-request',
		...base,
		payload: {
			requestId,
			toolCallId,
			toolName: typeof chunk.toolName === 'string' ? chunk.toolName : '',
			args: isRecord(chunk.input) ? chunk.input : {},
			severity: parseSeverity(suspendPayload.severity),
			message:
				typeof suspendPayload.message === 'string'
					? suspendPayload.message
					: 'Confirmation required',
			...(credentialRequests ? { credentialRequests } : {}),
			...(projectId ? { projectId } : {}),
			...(inputType ? { inputType } : {}),
			...(domainAccess ? { domainAccess } : {}),
			...(webSearch ? { webSearch } : {}),
			...(credentialFlow ? { credentialFlow } : {}),
			...(setupRequests ? { setupRequests } : {}),
			...(workflowId ? { workflowId } : {}),
			...(questions ? { questions } : {}),
			...(introMessage ? { introMessage } : {}),
			...(tasks ? { tasks } : {}),
			...(planItems ? { planItems } : {}),
			...(resourceDecision ? { resourceDecision } : {}),
		},
	};
}

function toolCallFromContent(part: unknown, base: EventBase): InstanceAiEvent | null {
	if (!isRecord(part) || part.type !== 'tool-call') return null;
	return {
		type: 'tool-call',
		...base,
		payload: {
			toolCallId: typeof part.toolCallId === 'string' ? part.toolCallId : '',
			toolName: typeof part.toolName === 'string' ? part.toolName : '',
			args: isRecord(part.input) ? part.input : {},
		},
	};
}

function toolResultFromContent(part: unknown, base: EventBase): InstanceAiEvent | null {
	if (!isRecord(part) || part.type !== 'tool-result') return null;
	const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : '';
	if (part.isError === true) {
		return {
			type: 'tool-error',
			...base,
			payload: { toolCallId, error: extractToolErrorText(part.result) },
		};
	}
	return {
		type: 'tool-result',
		...base,
		payload: { toolCallId, result: part.result },
	};
}

function mapMessageChunk(
	chunk: Extract<StreamChunk, { type: 'message' }>,
	base: EventBase,
): InstanceAiEvent | null {
	const message = getRecordProperty(chunk, 'message');
	if (message?.role !== 'tool') return null;

	const content = getArrayProperty(message, 'content');
	if (!content) return null;

	const toolCall = toolCallFromContent(
		content.find((part) => isRecord(part) && part.type === 'tool-call'),
		base,
	);
	if (toolCall) return toolCall;

	return toolResultFromContent(
		content.find((part) => isRecord(part) && part.type === 'tool-result'),
		base,
	);
}

function mapErrorChunk(
	chunk: Extract<StreamChunk, { type: 'error' }>,
	base: EventBase,
): InstanceAiEvent {
	const errorInfo = extractErrorInfo(chunk.error);
	return {
		type: 'error',
		...base,
		payload: {
			content: errorInfo.content,
			...(errorInfo.statusCode !== undefined ? { statusCode: errorInfo.statusCode } : {}),
			...(errorInfo.provider ? { provider: errorInfo.provider } : {}),
			...(errorInfo.technicalDetails ? { technicalDetails: errorInfo.technicalDetails } : {}),
		},
	};
}

export function mapAgentChunkToEvent(
	runId: string,
	agentId: string,
	chunk: unknown,
	responseId?: string,
): InstanceAiEvent | null {
	if (!isAgentStreamChunk(chunk)) return null;

	const base: EventBase = { runId, agentId, ...(responseId ? { responseId } : {}) };

	switch (chunk.type) {
		case 'text-delta':
			return { type: 'text-delta', ...base, payload: { text: chunk.delta } };
		case 'reasoning-delta':
			return { type: 'reasoning-delta', ...base, payload: { text: chunk.delta } };
		case 'tool-call':
			return mapToolCallChunk(chunk, base);
		case 'tool-result':
			return mapToolResultChunk(chunk, base);
		case 'tool-call-suspended':
			return mapSuspendedChunk(chunk, base);
		case 'message':
			return mapMessageChunk(chunk, base);
		case 'error':
			return mapErrorChunk(chunk, base);
		default:
			return null;
	}
}
