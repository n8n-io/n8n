import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../types';
import type { EvalEndToEndFinding, EvalEndToEndToolSelectionResult } from './types';

const EVALS_TOOL_NAME = 'evals';
const EVAL_SETUP_TOOL_NAME = 'eval-setup-with-agent';
const EVAL_DATA_TOOL_NAME = 'eval-data';
const EVAL_SETUP_AGENT_NAMES = new Set([EVAL_SETUP_TOOL_NAME, 'eval-setup']);
const EVAL_DATA_AGENT_NAMES = new Set([EVAL_DATA_TOOL_NAME, 'eval-data-generator']);
const EVALS_ACTIONS = ['offer', 'select-metrics', 'propose', 'offer-data-population'] as const;
const EVALS_PROPOSE_ACTION = 'propose';
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
	const evalsActionsCalled = collectEvalsActions(input);
	const evalsToolCalled =
		evalsActionsCalled.length > 0 ||
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
			message: 'Instance AI did not call the evals tool',
		});
	}

	// `propose` is the load-bearing action — it builds the task spec for
	// eval-setup-with-agent and creates the empty DataTable. Without it the
	// downstream chain cannot run, so it gets its own error code.
	if (!evalsActionsCalled.includes(EVALS_PROPOSE_ACTION)) {
		findings.push({
			severity: 'error',
			code: 'evals_propose_not_called',
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
		evalsActionsCalled,
		evalSetupAgentCalled,
		evalDataToolCalled,
		findings,
	};
}

/**
 * Collect the distinct `evals` action names invoked across captured events
 * and rich thread messages. Reads `args.action` directly off the structured
 * tool-call payloads — does not rely on free-form traversal.
 */
function collectEvalsActions(input: {
	events: CapturedEvent[];
	threadMessages?: InstanceAiRichMessagesResponse;
}): string[] {
	const actions = new Set<string>();

	for (const event of input.events) {
		const eventType = event.type.toLowerCase();
		if (!TOOL_CALL_EVENT_TYPES.has(eventType) && eventType !== 'confirmation-request') continue;
		const action = readEvalsActionFromEventData(event.data);
		if (action !== undefined) actions.add(action);
	}

	visitRichAgentTrees(input.threadMessages, (agentNode) => {
		for (const toolCall of agentNode.toolCalls) {
			if (toolCall.toolName !== EVALS_TOOL_NAME) continue;
			const action = readActionFromArgs(toolCall.args);
			if (action !== undefined) actions.add(action);
		}
		return false;
	});

	const ordered: string[] = [];
	for (const action of EVALS_ACTIONS) {
		if (actions.has(action)) ordered.push(action);
	}
	// Preserve any unexpected action names too — useful for diagnosing drift
	// when a new evals action is added but this list isn't updated.
	for (const action of actions) {
		if (!ordered.includes(action)) ordered.push(action);
	}
	return ordered;
}

function readEvalsActionFromEventData(data: Record<string, unknown>): string | undefined {
	const payload = data.payload;
	if (!isRecord(payload)) return undefined;
	if (payload.toolName !== EVALS_TOOL_NAME) return undefined;
	return readActionFromArgs(payload.args);
}

function readActionFromArgs(args: unknown): string | undefined {
	if (!isRecord(args)) return undefined;
	const action = args.action;
	return typeof action === 'string' ? action : undefined;
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
