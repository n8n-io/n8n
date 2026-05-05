import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import type { CapturedEvent } from '../types';
import type { ToolSelectionResult } from './types';

const EVALS_TOOL_NAME = 'evals';
const EVAL_SETUP_TOOL_NAME = 'eval-setup-with-agent';
const EVAL_SETUP_AGENT_NAMES = new Set(['eval-setup', EVAL_SETUP_TOOL_NAME]);
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

const EVALS_MISSING_FINDING = {
	severity: 'error',
	code: 'evals_tool_not_called',
	message: 'Instance AI did not call evals(action="propose")',
} as const;

const EVAL_SETUP_MISSING_FINDING = {
	severity: 'error',
	code: 'eval_setup_agent_not_called',
	message: 'Instance AI did not call eval-setup-with-agent after evals approval',
} as const;

export function extractToolSelection(input: {
	events: CapturedEvent[];
	threadMessages?: InstanceAiRichMessagesResponse;
	expectNoEvalNodes?: boolean;
}): ToolSelectionResult {
	const evalsToolCalled =
		input.events.some((event) => eventContainsToolCall(event, EVALS_TOOL_NAME)) ||
		richMessagesContainToolCall(input.threadMessages, EVALS_TOOL_NAME);
	const evalSetupAgentCalled =
		input.events.some(
			(event) =>
				eventContainsToolCall(event, EVAL_SETUP_TOOL_NAME) || eventContainsEvalSetupAgent(event),
		) || richMessagesContainEvalSetupAgent(input.threadMessages);
	const findings: ToolSelectionResult['findings'] = [];

	if (input.expectNoEvalNodes) {
		return {
			evalsToolCalled,
			evalSetupAgentCalled,
			findings,
		};
	}

	if (!evalsToolCalled) {
		findings.push(EVALS_MISSING_FINDING);
	}

	if (!evalSetupAgentCalled) {
		findings.push(EVAL_SETUP_MISSING_FINDING);
	}

	return {
		evalsToolCalled,
		evalSetupAgentCalled,
		findings,
	};
}

function eventContainsToolCall(event: CapturedEvent, expectedToolName: string): boolean {
	return visitEventRecords(event, (record, context) => {
		if (!context.isToolSurface) {
			return false;
		}

		return TOOL_NAME_KEYS.some((key) => getString(record, key) === expectedToolName);
	});
}

function eventContainsEvalSetupAgent(event: CapturedEvent): boolean {
	return visitEventRecords(event, (record, context) => {
		if (!context.isAgentSurface) {
			return false;
		}

		return AGENT_NAME_KEYS.some((key) => isEvalSetupAgentName(getString(record, key)));
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

function richMessagesContainEvalSetupAgent(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
): boolean {
	if (!threadMessages) {
		return false;
	}

	return (
		richMessagesContainToolCall(threadMessages, EVAL_SETUP_TOOL_NAME) ||
		visitRichAgentTrees(threadMessages, (agentNode) =>
			AGENT_NAME_KEYS.some((key) => isEvalSetupAgentName(getString(agentNode, key))),
		)
	);
}

function visitRichAgentTrees(
	threadMessages: InstanceAiRichMessagesResponse | undefined,
	predicate: (
		agentNode: NonNullable<InstanceAiRichMessagesResponse['messages'][number]['agentTree']>,
	) => boolean,
): boolean {
	if (!threadMessages) {
		return false;
	}

	const seenAgentNodes = new WeakSet<object>();
	const agentNodes = threadMessages.messages
		.map((message) => message.agentTree)
		.filter((agentTree) => agentTree !== undefined);

	while (agentNodes.length > 0) {
		const agentNode = agentNodes.pop();

		if (!agentNode) {
			continue;
		}

		if (seenAgentNodes.has(agentNode)) {
			continue;
		}
		seenAgentNodes.add(agentNode);

		if (predicate(agentNode)) {
			return true;
		}

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
	const isToolEvent = eventType === 'tool-call';
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

		if (!currentEntry) {
			continue;
		}

		const { value: currentValue, parentKey } = currentEntry;

		if (!isRecord(currentValue) && !Array.isArray(currentValue)) {
			continue;
		}

		if (seenObjects.has(currentValue)) {
			continue;
		}
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

		if (predicate(currentValue, { isToolSurface, isAgentSurface })) {
			return true;
		}

		for (const [key, value] of Object.entries(currentValue)) {
			if (IGNORED_EVENT_TRAVERSAL_KEYS.has(key)) {
				continue;
			}

			valuesToInspect.push({
				value,
				parentKey: key,
				isToolSurface,
				isAgentSurface,
			});
		}
	}

	return false;
}

function isAgentRecord(value: Record<string, unknown>): boolean {
	return hasString(value, 'agentId') || hasString(value, 'taskId');
}

function isEvalSetupAgentName(value: string | undefined): boolean {
	return value !== undefined && EVAL_SETUP_AGENT_NAMES.has(value.toLowerCase());
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
