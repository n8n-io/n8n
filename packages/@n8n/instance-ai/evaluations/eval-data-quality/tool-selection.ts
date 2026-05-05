import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../types';
import type { ToolSelectionResult } from './types';

const EVAL_DATA_TOOL_NAME = 'eval-data';
const EVAL_DATA_AGENT_ROLE = 'eval-data';
const TOOL_CALL_EVENT_TYPES = new Set(['tool-call']);
const AGENT_SPAWN_EVENT_TYPES = new Set(['agent-spawned']);
const TOOL_NAME_KEYS = ['toolName', 'tool', 'name'] as const;
const AGENT_ROLE_KEYS = ['role', 'kind'] as const;

const EVAL_DATA_MISSING_FINDING = {
	severity: 'error',
	code: 'eval_data_tool_not_called',
	message: 'Instance AI did not call the eval-data tool',
} as const;

export function extractToolSelection(input: {
	events: CapturedEvent[];
	threadMessages?: InstanceAiRichMessagesResponse;
}): ToolSelectionResult {
	const evalDataToolCalled =
		input.events.some(
			(event) =>
				eventContainsToolCall(event, EVAL_DATA_TOOL_NAME) || eventSpawnsEvalDataAgent(event),
		) || richMessagesContainToolCall(input.threadMessages, EVAL_DATA_TOOL_NAME);

	return {
		evalDataToolCalled,
		findings: evalDataToolCalled ? [] : [EVAL_DATA_MISSING_FINDING],
	};
}

function eventContainsToolCall(event: CapturedEvent, expectedToolName: string): boolean {
	if (!TOOL_CALL_EVENT_TYPES.has(event.type.toLowerCase())) return false;
	return findStringDeep(event.data, TOOL_NAME_KEYS, expectedToolName);
}

function eventSpawnsEvalDataAgent(event: CapturedEvent): boolean {
	if (!AGENT_SPAWN_EVENT_TYPES.has(event.type.toLowerCase())) return false;
	return findStringDeep(event.data, AGENT_ROLE_KEYS, EVAL_DATA_AGENT_ROLE);
}

function richMessagesContainToolCall(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
	expectedToolName: string,
): boolean {
	if (!threadMessages) return false;

	const seen = new WeakSet<object>();
	const stack = threadMessages.messages
		.map((message) => message.agentTree)
		.filter((tree): tree is NonNullable<typeof tree> => tree !== undefined);

	while (stack.length > 0) {
		const node = stack.pop();
		if (!node || seen.has(node)) continue;
		seen.add(node);

		const matched = node.toolCalls.some((toolCall) =>
			TOOL_NAME_KEYS.some((key) => getString(toolCall, key) === expectedToolName),
		);
		if (matched) return true;

		stack.push(...node.children);
	}

	return false;
}

function findStringDeep(value: unknown, keys: readonly string[], target: string): boolean {
	const seen = new WeakSet<object>();
	const stack: unknown[] = [value];

	while (stack.length > 0) {
		const current = stack.pop();
		if (!isObjectLike(current)) continue;
		if (seen.has(current)) continue;
		seen.add(current);

		if (Array.isArray(current)) {
			for (const item of current) stack.push(item);
			continue;
		}

		const record = current;
		if (keys.some((key) => getString(record, key) === target)) return true;

		for (const propertyValue of Object.values(record)) {
			stack.push(propertyValue);
		}
	}

	return false;
}

function isObjectLike(value: unknown): value is object {
	return typeof value === 'object' && value !== null;
}

function getString(value: object, key: string): string | undefined {
	const property = (value as Record<string, unknown>)[key];
	return typeof property === 'string' ? property : undefined;
}
