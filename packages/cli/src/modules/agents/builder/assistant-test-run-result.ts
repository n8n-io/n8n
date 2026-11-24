import type { ToolCallSimulation } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type {
	DraftRunSimulation,
	LocalToolCall,
	SimulatedToolCall,
} from '../agent-test-run.service';

export const SIMULATED_TEST_RUN_NOTE =
	'This was a simulated test run. No real emails, messages, or external writes were sent. ' +
	'Describe simulated actions as what the agent would have done in the test run ' +
	'(for example, "in the test run it would have sent an email"), never as completed real actions.';

export type AssistantTestRunPreview =
	| {
			kind: 'email';
			toolName: string;
			to?: string[];
			cc?: string[];
			bcc?: string[];
			subject?: string;
			body?: string;
	  }
	| {
			kind: 'chatMessage';
			toolName: string;
			channel?: string;
			recipient?: string;
			text?: string;
	  }
	| {
			kind: 'issue';
			toolName: string;
			project?: string | null;
			title?: string | null;
			description?: string | null;
			assignee?: string | null;
			labels?: string[] | null;
	  }
	| {
			kind: 'tableRow';
			toolName: string;
			table?: string;
			columns?: Record<string, unknown>;
	  }
	| {
			kind: 'calendarEvent';
			toolName: string;
			title?: string;
			start?: string;
			end?: string;
			location?: string;
			attendees?: string[];
			description?: string;
	  }
	| {
			kind: 'generic';
			toolName: string;
			input?: Record<string, unknown>;
	  };

export interface AssistantTestRunToolCall extends ToolCallSimulation {
	toolCallId: string;
	toolName: string;
	preview?: AssistantTestRunPreview;
}

export interface AssistantTestRunSimulationPayload {
	worldId?: string;
	toolCalls: AssistantTestRunToolCall[];
	localToolCalls?: LocalToolCall[];
}

function unwrapValue(value: unknown): unknown {
	if (isRecord(value) && value.__rl === true && 'value' in value) {
		return value.value;
	}
	return value;
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const raw = unwrapValue(record[key]);
		if (typeof raw === 'string' && raw.trim().length > 0) {
			return raw.trim();
		}
	}
	return undefined;
}

function readNullableString(
	record: Record<string, unknown>,
	keys: string[],
): string | null | undefined {
	for (const key of keys) {
		if (!(key in record)) continue;
		const raw = unwrapValue(record[key]);
		if (raw === null) return null;
		if (typeof raw === 'string') return raw;
	}
	return undefined;
}

function readStringList(record: Record<string, unknown>, keys: string[]): string[] | undefined {
	for (const key of keys) {
		const raw = unwrapValue(record[key]);
		if (typeof raw === 'string') {
			const items = raw
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item.length > 0);
			if (items.length > 0) return items;
		}
		if (Array.isArray(raw)) {
			const items = raw
				.map((item) => {
					const unwrapped = unwrapValue(item);
					if (typeof unwrapped === 'string') return unwrapped.trim();
					if (isRecord(unwrapped) && typeof unwrapped.email === 'string') {
						return unwrapped.email.trim();
					}
					return '';
				})
				.filter((item) => item.length > 0);
			if (items.length > 0) return items;
		}
	}
	return undefined;
}

function readNullableStringList(
	record: Record<string, unknown>,
	keys: string[],
): string[] | null | undefined {
	for (const key of keys) {
		if (!(key in record)) continue;
		const raw = unwrapValue(record[key]);
		if (raw === null) return null;
		if (Array.isArray(raw)) {
			return raw
				.map((item) => {
					const unwrapped = unwrapValue(item);
					return typeof unwrapped === 'string' ? unwrapped.trim() : '';
				})
				.filter((item) => item.length > 0);
		}
	}
	return undefined;
}

function isEmailTool(toolName: string, input: Record<string, unknown>): boolean {
	const name = toolName.toLowerCase();
	if (/(?:email|gmail|outlook|mail)/.test(name)) return true;
	return (
		readString(input, ['subject']) !== undefined &&
		readStringList(input, ['to', 'sendTo', 'toEmail', 'recipients']) !== undefined
	);
}

function isChatMessageTool(toolName: string, input: Record<string, unknown>): boolean {
	const name = toolName.toLowerCase();
	if (/(?:slack|discord|teams|telegram|whatsapp|post_message|send_message|chat)/.test(name)) {
		return true;
	}
	return (
		readString(input, ['channel', 'channelId', 'channelName', 'room']) !== undefined &&
		readString(input, ['text', 'message', 'content']) !== undefined
	);
}

function isIssueTool(toolName: string): boolean {
	return /(?:issue|ticket|linear|jira)/.test(toolName.toLowerCase());
}

function isCalendarEventTool(toolName: string): boolean {
	return /(?:calendar|event|meeting)/.test(toolName.toLowerCase());
}

function isTableRowTool(toolName: string): boolean {
	return /(?:row|sheet|table|airtable|record)/.test(toolName.toLowerCase());
}

/**
 * Extracts a structured preview of what a simulated tool call would have done.
 * Never call this for blocked calls.
 */
export function buildWouldHaveHappenedPreview(
	toolName: string,
	input: unknown,
): AssistantTestRunPreview {
	const record = isRecord(input) ? input : {};

	if (isEmailTool(toolName, record)) {
		const to = readStringList(record, ['to', 'sendTo', 'toEmail', 'recipients', 'recipient']);
		const cc = readStringList(record, ['cc', 'ccList']);
		const bcc = readStringList(record, ['bcc', 'bccList']);
		const subject = readString(record, ['subject']);
		const body = readString(record, ['body', 'message', 'text', 'html', 'content']);
		return {
			kind: 'email',
			toolName,
			...(to ? { to } : {}),
			...(cc ? { cc } : {}),
			...(bcc ? { bcc } : {}),
			...(subject ? { subject } : {}),
			...(body ? { body } : {}),
		};
	}

	if (isChatMessageTool(toolName, record)) {
		const channel = readString(record, ['channel', 'channelId', 'channelName', 'room', 'chatId']);
		const recipient = readString(record, ['recipient', 'user', 'userId', 'dmUser']);
		const text = readString(record, ['text', 'message', 'content', 'body']);
		return {
			kind: 'chatMessage',
			toolName,
			...(channel ? { channel } : {}),
			...(recipient ? { recipient } : {}),
			...(text ? { text } : {}),
		};
	}

	if (isIssueTool(toolName)) {
		const project = readNullableString(record, [
			'project',
			'team',
			'teamId',
			'repository',
			'repo',
			'board',
		]);
		const title = readNullableString(record, ['title', 'summary', 'name']);
		const description = readNullableString(record, ['description', 'body']);
		const assignee = readNullableString(record, ['assignee', 'assigneeId']);
		const labels = readNullableStringList(record, ['labels', 'labelIds']);
		return {
			kind: 'issue',
			toolName,
			...(project !== undefined ? { project } : {}),
			...(title !== undefined ? { title } : {}),
			...(description !== undefined ? { description } : {}),
			...(assignee !== undefined ? { assignee } : {}),
			...(labels !== undefined ? { labels } : {}),
		};
	}

	if (isCalendarEventTool(toolName)) {
		const title = readString(record, ['title', 'summary', 'subject']);
		const start = readString(record, ['start', 'startTime', 'startDate']);
		const end = readString(record, ['end', 'endTime', 'endDate']);
		const location = readString(record, ['location']);
		const attendees = readStringList(record, ['attendees']);
		const description = readString(record, ['description']);
		return {
			kind: 'calendarEvent',
			toolName,
			...(title ? { title } : {}),
			...(start ? { start } : {}),
			...(end ? { end } : {}),
			...(location ? { location } : {}),
			...(attendees ? { attendees } : {}),
			...(description ? { description } : {}),
		};
	}

	if (isTableRowTool(toolName)) {
		const table = readString(record, ['table', 'sheet', 'sheetName', 'database', 'base']);
		const explicitColumns = ['columns', 'fields', 'values', 'row']
			.map((key) => record[key])
			.find((val): val is Record<string, unknown> => isRecord(val));
		const columns =
			explicitColumns ??
			(Object.keys(record).length > 0
				? Object.fromEntries(
						Object.entries(record).filter(
							([key]) => !['table', 'sheet', 'sheetName', 'database', 'base'].includes(key),
						),
					)
				: undefined);
		return {
			kind: 'tableRow',
			toolName,
			...(table ? { table } : {}),
			...(columns && Object.keys(columns).length > 0 ? { columns } : {}),
		};
	}

	return {
		kind: 'generic',
		toolName,
		...(Object.keys(record).length > 0 ? { input: record } : {}),
	};
}

function formatSimulatedToolCall(call: SimulatedToolCall): AssistantTestRunToolCall {
	const base: AssistantTestRunToolCall = {
		toolCallId: call.toolCallId,
		toolName: call.toolName,
		route: call.route,
		reason: call.reason,
		...(call.detail ? { detail: call.detail } : {}),
		...(call.evidence ? { evidence: call.evidence } : {}),
	};

	if (call.route === 'simulated' || call.route === 'simulated_made_up') {
		return {
			...base,
			preview: buildWouldHaveHappenedPreview(call.toolName, call.input),
		};
	}

	return base;
}

export function formatAssistantTestRunSimulation(
	simulation: DraftRunSimulation | undefined,
): AssistantTestRunSimulationPayload {
	if (!simulation) {
		return { toolCalls: [] };
	}

	return {
		...(simulation.worldId ? { worldId: simulation.worldId } : {}),
		toolCalls: simulation.toolCalls.map(formatSimulatedToolCall),
		...(simulation.localToolCalls && simulation.localToolCalls.length > 0
			? { localToolCalls: simulation.localToolCalls }
			: {}),
	};
}
