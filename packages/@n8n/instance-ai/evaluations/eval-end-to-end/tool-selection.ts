import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../types';
import type { EvalEndToEndFinding, EvalEndToEndToolSelectionResult } from './types';

const EVALS_TOOL_NAME = 'evals';
const EVAL_SETUP_TOOL_NAME = 'eval-setup-with-agent';
const EVAL_DATA_TOOL_NAME = 'eval-data';
const EVAL_SETUP_AGENT_NAMES = new Set([EVAL_SETUP_TOOL_NAME, 'eval-setup']);
const EVAL_DATA_AGENT_NAMES = new Set([EVAL_DATA_TOOL_NAME, 'eval-data-generator']);
const TOOL_CALL_EVENT_TYPES = new Set(['tool-call']);
const TOOL_NAME_KEYS = ['toolName', 'tool', 'name'] as const;
const AGENT_NAME_KEYS = ['role', 'kind', 'name'] as const;
const IGNORED_EVENT_TRAVERSAL_KEYS = new Set([
	'args',
	'arguments',
	'availableTools',
	'content',
	'prompt',
	'result',
	'text',
	'toolList',
	'toolNames',
	'tools',
]);

export function extractToolSelection(input: {
	events: CapturedEvent[];
	threadMessages?: InstanceAiRichMessagesResponse;
}): EvalEndToEndToolSelectionResult {
	const evalsToolCalled =
		input.events.some((event) => eventContainsToolCall(event, EVALS_TOOL_NAME)) ||
		richMessagesContainToolCall(input.threadMessages, EVALS_TOOL_NAME);

	const evalSetupAgentCalled =
		input.events.some(
			(event) =>
				eventContainsToolCall(event, EVAL_SETUP_TOOL_NAME) ||
				eventContainsAgent(event, EVAL_SETUP_AGENT_NAMES),
		) || richMessagesContainAgent(input.threadMessages, EVAL_SETUP_AGENT_NAMES);

	const evalDataToolCalled =
		input.events.some(
			(event) =>
				eventContainsToolCall(event, EVAL_DATA_TOOL_NAME) ||
				eventContainsAgent(event, EVAL_DATA_AGENT_NAMES),
		) || richMessagesContainAgent(input.threadMessages, EVAL_DATA_AGENT_NAMES);

	const findings: EvalEndToEndFinding[] = [];

	if (!evalsToolCalled) {
		findings.push({
			severity: 'error',
			code: 'evals_tool_not_called',
			message: 'Instance AI did not call evals(action="propose")',
		});
	}

	if (!evalSetupAgentCalled) {
		findings.push({
			severity: 'error',
			code: 'eval_setup_agent_not_called',
			message: 'Instance AI did not call eval-setup-with-agent',
		});
	}

	if (!evalDataToolCalled) {
		findings.push({
			severity: 'error',
			code: 'eval_data_tool_not_called',
			message: 'Instance AI did not call eval-data to populate the DataTable',
		});
	}

	return {
		evalsToolCalled,
		evalSetupAgentCalled,
		evalDataToolCalled,
		findings,
	};
}

function eventContainsToolCall(event: CapturedEvent, expectedToolName: string): boolean {
	return visitEventRecords(event, (record, context) => {
		if (!context.isToolSurface) return false;
		return TOOL_NAME_KEYS.some((key) => getString(record, key) === expectedToolName);
	});
}

function eventContainsAgent(event: CapturedEvent, agentNames: Set<string>): boolean {
	return visitEventRecords(event, (record, context) => {
		if (!context.isAgentSurface) return false;
		return AGENT_NAME_KEYS.some((key) => isAgentName(getString(record, key), agentNames));
	});
}

function richMessagesContainToolCall(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
	expectedToolName: string,
): boolean {
	return visitRichAgentTrees(threadMessages, (agentNode) =>
		agentNode.toolCalls.some((toolCall) =>
			TOOL_NAME_KEYS.some((key) => getString(toolCall, key) === expectedToolName),
		),
	);
}

function richMessagesContainAgent(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
	agentNames: Set<string>,
): boolean {
	if (!threadMessages) return false;
	return visitRichAgentTrees(threadMessages, (agentNode) =>
		AGENT_NAME_KEYS.some((key) => isAgentName(getString(agentNode, key), agentNames)),
	);
}

function visitRichAgentTrees(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
	predicate: (
		agentNode: NonNullable<InstanceAiRichMessagesResponse['messages'][number]['agentTree']>,
	) => boolean,
): boolean {
	if (!threadMessages) return false;

	const seenAgentNodes = new WeakSet<object>();
	const agentNodes = threadMessages.messages
		.map((message) => message.agentTree)
		.filter((agentTree) => agentTree !== undefined);

	while (agentNodes.length > 0) {
		const agentNode = agentNodes.pop();
		if (!agentNode) continue;
		if (seenAgentNodes.has(agentNode)) continue;
		seenAgentNodes.add(agentNode);

		if (predicate(agentNode)) return true;

		agentNodes.push(...agentNode.children);
	}

	return false;
}

interface EventRecordContext {
	isToolSurface: boolean;
	isAgentSurface: boolean;
}

function visitEventRecords(
	event: CapturedEvent,
	predicate: (record: Record<string, unknown>, context: EventRecordContext) => boolean,
): boolean {
	const eventType = event.type.toLowerCase();
	const isToolEvent = TOOL_CALL_EVENT_TYPES.has(eventType);
	const isAgentEvent = eventType.includes('agent') || eventType.includes('task');
	const seenObjects = new WeakSet<object>();
	const valuesToInspect: Array<{
		value: unknown;
		parentKey?: string;
		isToolSurface: boolean;
		isAgentSurface: boolean;
	}> = [
		{
			value: event.data,
			isToolSurface: isToolEvent,
			isAgentSurface: isAgentEvent,
		},
	];

	while (valuesToInspect.length > 0) {
		const currentEntry = valuesToInspect.pop();
		if (!currentEntry) continue;

		const { value: currentValue, parentKey } = currentEntry;
		if (!isRecord(currentValue) && !Array.isArray(currentValue)) continue;
		if (seenObjects.has(currentValue)) continue;
		seenObjects.add(currentValue);

		if (Array.isArray(currentValue)) {
			for (const value of currentValue) {
				valuesToInspect.push({
					value,
					parentKey,
					isToolSurface: currentEntry.isToolSurface,
					isAgentSurface: currentEntry.isAgentSurface,
				});
			}
			continue;
		}

		const isToolSurface =
			currentEntry.isToolSurface &&
			(parentKey === undefined || parentKey === 'payload' || parentKey === 'toolCall');
		const isAgentSurface =
			currentEntry.isAgentSurface || parentKey === 'backgroundTasks' || isAgentRecord(currentValue);

		if (predicate(currentValue, { isToolSurface, isAgentSurface })) return true;

		for (const [key, value] of Object.entries(currentValue)) {
			if (IGNORED_EVENT_TRAVERSAL_KEYS.has(key)) continue;
			valuesToInspect.push({ value, parentKey: key, isToolSurface, isAgentSurface });
		}
	}

	return false;
}

function isAgentRecord(value: Record<string, unknown>): boolean {
	return hasString(value, 'agentId') || hasString(value, 'taskId');
}

function isAgentName(value: string | undefined, agentNames: Set<string>): boolean {
	return value !== undefined && agentNames.has(value.toLowerCase());
}

function getString(value: object, key: string): string | undefined {
	const propertyValue = (value as Record<string, unknown>)[key];
	return typeof propertyValue === 'string' ? propertyValue : undefined;
}

function hasString(value: object, key: string): boolean {
	return typeof (value as Record<string, unknown>)[key] === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
