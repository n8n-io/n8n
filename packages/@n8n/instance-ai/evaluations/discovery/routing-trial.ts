// ---------------------------------------------------------------------------
// Turns one trial's event stream into the routing results record.
//
// The route is read from the orchestrator's own calls, so sub-agent calls go
// to a separate list. Under `--stop-on-route`, calls and text after the stop
// are dropped: the grader sees the calls "until the stop". Tool results that
// arrive later still settle the status of a recorded call.
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type {
	DiscoveryStreamStatus,
	RoutingAskUserQuestion,
	RoutingToolCall,
	RoutingToolCallStatus,
	RoutingTrialRecord,
	RoutingSubAgentToolCall,
} from './types';
import type { RunTokenUsage } from '../../src/stream/usage-accumulator';
import { DOMAIN_TOOL_IDS } from '../../src/tools/tool-ids';

export const ORCHESTRATOR_AGENT_ID = 'n8n-instance-agent';

const LOAD_SKILL_TOOL_NAME = 'load_skill';

/** Keeps the results file small when a call carries generated code or file content. */
const MAX_ARG_STRING_LENGTH = 4000;
const MAX_ERROR_LENGTH = 500;

export interface RouteStop {
	/** Number of events published up to and including the committing call. */
	eventIndex: number;
	toolName: string;
	args: Record<string, unknown>;
}

export interface RoutingTrialInput {
	trial: number;
	events: InstanceAiEvent[];
	durationMs: number;
	streamStatus: DiscoveryStreamStatus;
	stop?: RouteStop;
	usage?: RunTokenUsage;
	runError?: string;
}

export function buildRoutingTrialRecord(input: RoutingTrialInput): RoutingTrialRecord {
	const { events, stop } = input;
	const beforeStop = stop ? events.slice(0, stop.eventIndex) : events;

	const settled = new Map<string, { status: RoutingToolCallStatus; error?: string }>();
	const results = new Map<string, unknown>();
	const roles = new Map<string, string>();
	const spawnedAgents: string[] = [];
	const activatedSkills: string[] = [];

	for (const event of events) {
		if (event.type === 'tool-result') {
			settled.set(event.payload.toolCallId, { status: 'completed' });
			results.set(event.payload.toolCallId, event.payload.result);
		} else if (event.type === 'tool-error' || event.type === 'tool-interrupted') {
			settled.set(event.payload.toolCallId, {
				status: 'errored',
				error: truncate(event.payload.error, MAX_ERROR_LENGTH),
			});
		} else if (event.type === 'agent-spawned') {
			roles.set(event.agentId, event.payload.role);
			pushUnique(spawnedAgents, event.payload.role);
		}
		for (const skillId of activatedSkillIdsOf(event)) pushUnique(activatedSkills, skillId);
	}

	const toolCalls: RoutingToolCall[] = [];
	const subAgentToolCalls: RoutingSubAgentToolCall[] = [];
	const skillsLoaded: string[] = [];
	const askUserQuestions: RoutingAskUserQuestion[] = [];
	const textSegments: string[] = [];
	let currentText = '';

	for (const event of beforeStop) {
		const fromOrchestrator = event.agentId === ORCHESTRATOR_AGENT_ID;
		if (event.type === 'text-delta' && fromOrchestrator) {
			currentText += event.payload.text;
			continue;
		}
		if (event.type !== 'tool-call') continue;

		const { toolCallId, toolName, args } = event.payload;
		const outcome = settled.get(toolCallId) ?? { status: 'pending' as const };
		const call: RoutingToolCall = { toolName, args: compactArgs(args), ...outcome };

		if (!fromOrchestrator) {
			subAgentToolCalls.push({ ...call, agentRole: roles.get(event.agentId) ?? event.agentId });
			continue;
		}

		toolCalls.push(call);
		if (currentText.trim()) textSegments.push(currentText);
		currentText = '';

		if (toolName === LOAD_SKILL_TOOL_NAME) {
			const skillId = loadedSkillId(args, results.get(toolCallId));
			if (skillId) pushUnique(skillsLoaded, skillId);
		}
		if (toolName === DOMAIN_TOOL_IDS.ASK_USER) askUserQuestions.push(...askUserQuestionsOf(args));
	}

	for (const skillId of activatedSkills) pushUnique(skillsLoaded, skillId);

	const trailingText = currentText.trim() ? currentText : '';
	const allSegments = trailingText ? [...textSegments, trailingText] : textSegments;

	return {
		trial: input.trial,
		durationMs: input.durationMs,
		streamStatus: input.streamStatus,
		toolCalls,
		subAgentToolCalls,
		...(stop ? { stoppedOn: { toolName: stop.toolName, args: compactArgs(stop.args) } } : {}),
		spawnedAgents,
		skillsLoaded,
		askUserQuestions,
		finalText: (trailingText || textSegments.at(-1) || '').trim(),
		fullText: allSegments.map((segment) => segment.trim()).join('\n\n'),
		...(input.usage
			? {
					usage: {
						inputTokens: input.usage.promptTokens,
						outputTokens: input.usage.completionTokens,
						costUsd: input.usage.costUsd,
					},
				}
			: {}),
		...(input.runError ? { runError: input.runError } : {}),
	};
}

/**
 * The skill a `load_skill` call loaded, or undefined when it failed or has no
 * result yet. The call names the skill by `skillId` or `name`. A main-skill load
 * returns text content; other loads return `{ success, skillId }`.
 */
function loadedSkillId(args: Record<string, unknown>, result: unknown): string | undefined {
	if (!isRecord(result)) return undefined;
	if (result.type !== 'content' && result.success !== true) return undefined;
	if (typeof result.skillId === 'string') return result.skillId;
	if (typeof args.skillId === 'string') return args.skillId;
	return typeof args.name === 'string' ? args.name : undefined;
}

function askUserQuestionsOf(args: Record<string, unknown>): RoutingAskUserQuestion[] {
	if (!Array.isArray(args.questions)) return [];
	const introMessage = typeof args.introMessage === 'string' ? args.introMessage : undefined;
	const questions: RoutingAskUserQuestion[] = [];
	for (const entry of args.questions) {
		if (!isRecord(entry) || typeof entry.question !== 'string') continue;
		const options = Array.isArray(entry.options)
			? entry.options.filter((option): option is string => typeof option === 'string')
			: [];
		questions.push({
			question: entry.question,
			options,
			...(introMessage ? { introMessage } : {}),
		});
	}
	return questions;
}

/** Programmatic skill activations, when an event reports them. */
function activatedSkillIdsOf(event: InstanceAiEvent): string[] {
	const payload: unknown = event.payload;
	if (!isRecord(payload)) return [];
	const sources = [payload.activatedSkillIds];
	if (isRecord(payload.result)) sources.push(payload.result.activatedSkillIds);
	return sources.flatMap((source) =>
		Array.isArray(source) ? source.filter((id): id is string => typeof id === 'string') : [],
	);
}

function compactArgs(args: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(args).map(([key, value]) => [key, compact(value)]));
}

function compact(value: unknown): unknown {
	if (typeof value === 'string') return truncate(value, MAX_ARG_STRING_LENGTH);
	if (Array.isArray(value)) return value.map(compact);
	if (isRecord(value)) return compactArgs(value);
	return value;
}

function truncate(text: string, max: number): string {
	return text.length > max
		? `${text.slice(0, max)}… [truncated ${String(text.length - max)} chars]`
		: text;
}

function pushUnique(list: string[], value: string): void {
	if (!list.includes(value)) list.push(value);
}
