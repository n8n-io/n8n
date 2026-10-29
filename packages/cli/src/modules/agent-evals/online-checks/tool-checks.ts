import type {
	AgentCheck,
	AgentToolProfile,
	ChatTurn,
	CheckMoment,
	CheckVerdict,
	TimelineEvent,
} from './types';

type ToolCallEvent = Extract<TimelineEvent, { type: 'tool-call' }>;

const REPEAT_LIMIT = 3;

const EMPTY_REPLY: AgentCheck = {
	id: 'tool:empty_reply',
	kind: 'tool',
	question: 'Did the agent answer every message?',
	reason: 'A turn that ends with no reply leaves the person waiting.',
	source: { field: 'base' },
};

const TOOL_FAILED: AgentCheck = {
	id: 'tool:tool_failed',
	kind: 'tool',
	question: 'Did every tool call work?',
	reason: 'A failed tool call often means a wrong setup or a missing permission.',
	source: { field: 'tools' },
};

const REPEATED_CALL: AgentCheck = {
	id: 'tool:repeated_call',
	kind: 'tool',
	question: `Did the agent avoid making the same call ${REPEAT_LIMIT} times in a row?`,
	reason: 'The same call again and again usually means the agent is stuck.',
	source: { field: 'tools' },
};

const ACTED_AFTER_NO: AgentCheck = {
	id: 'tool:acted_after_no',
	kind: 'tool',
	question: 'After someone said no to an action, did the agent stop asking for it?',
	reason: 'Some tools ask for approval first. Asking again after a no ignores the answer.',
	source: { field: 'tools' },
};

const HIT_LIMIT: AgentCheck = {
	id: 'tool:hit_limit',
	kind: 'tool',
	question: 'Did the agent finish without hitting a limit?',
	reason: 'A limit stops the agent part way through the task.',
	source: { field: 'tools' },
};

/** The checks that need no model call. Which ones apply depends on the tools. */
export function generateToolChecks(profiles: AgentToolProfile[]): AgentCheck[] {
	if (profiles.length === 0) return [EMPTY_REPLY];
	const checks = [EMPTY_REPLY, TOOL_FAILED, REPEATED_CALL, HIT_LIMIT];
	if (profiles.some((p) => p.requireApproval)) checks.push(ACTED_AFTER_NO);
	return checks;
}

function verdict(
	check: AgentCheck,
	status: CheckVerdict['status'],
	reason: string,
	moment?: CheckMoment,
): CheckVerdict {
	return moment
		? { checkId: check.id, status, reason, moment }
		: { checkId: check.id, status, reason };
}

function toolCalls(timeline: TimelineEvent[]): ToolCallEvent[] {
	return timeline.filter((e): e is ToolCallEvent => e.type === 'tool-call');
}

function runEmptyReply(turns: ChatTurn[]): CheckVerdict {
	const index = turns.findIndex((t) => t.reply.trim().length === 0);
	if (index === -1) return verdict(EMPTY_REPLY, 'pass', 'Every turn has a reply.');
	const reason = turns[index].runFailed
		? 'The run failed and the person got no reply.'
		: 'This turn ended with no reply.';
	return verdict(EMPTY_REPLY, 'fail', reason, { turnIndex: index });
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Why a call failed, or null when it did not. Measured on recorded timelines: a
 * workflow tool that errors is recorded as `success: true` with
 * `{ status: 'error', error }` in its output, and a call that waits for
 * approval is recorded as `success: false` beside a `suspension`. Neither flag
 * alone tells a failure apart.
 */
function failureOf(call: ToolCallEvent, pendingApproval: Set<string>): string | null {
	if (call.canceled || pendingApproval.has(call.toolCallId)) return null;
	const output = isRecord(call.output) ? call.output : {};
	if (output.declined === true) return null;
	if (output.status === 'error') {
		return typeof output.error === 'string' ? output.error : 'it returned an error';
	}
	return call.success ? null : 'it did not finish';
}

function runToolFailed(turns: ChatTurn[]): CheckVerdict {
	let ran = 0;
	for (const [turnIndex, turn] of turns.entries()) {
		const timeline = turn.timeline ?? [];
		const pendingApproval = new Set(
			timeline.flatMap((e) => (e.type === 'suspension' ? [e.toolCallId] : [])),
		);
		for (const call of toolCalls(timeline)) {
			ran++;
			const failure = failureOf(call, pendingApproval);
			if (failure) {
				return verdict(TOOL_FAILED, 'fail', `The tool "${call.name}" failed: ${failure}`, {
					turnIndex,
					toolCallId: call.toolCallId,
				});
			}
		}
	}
	if (ran === 0) return verdict(TOOL_FAILED, 'not_applicable', 'No tool ran.');
	return verdict(TOOL_FAILED, 'pass', `All ${ran} tool calls worked.`);
}

function runRepeatedCall(turns: ChatTurn[]): CheckVerdict {
	let ran = 0;
	for (const [turnIndex, turn] of turns.entries()) {
		let streak = 0;
		let previous = '';
		for (const call of toolCalls(turn.timeline ?? [])) {
			ran++;
			const key = `${call.name}\u0000${JSON.stringify(call.input)}`;
			streak = key === previous ? streak + 1 : 1;
			previous = key;
			if (streak >= REPEAT_LIMIT) {
				return verdict(
					REPEATED_CALL,
					'fail',
					`The agent called "${call.name}" ${REPEAT_LIMIT} times in a row with the same input.`,
					{ turnIndex, toolCallId: call.toolCallId },
				);
			}
		}
	}
	if (ran === 0) return verdict(REPEATED_CALL, 'not_applicable', 'No tool ran.');
	return verdict(REPEATED_CALL, 'pass', 'No call repeated.');
}

function isRefusal(response: unknown): boolean {
	if (typeof response === 'boolean') return !response;
	if (typeof response !== 'object' || response === null) return false;
	const record = response as Record<string, unknown>;
	return record.approved === false || record.decision === 'deny' || record.decision === 'reject';
}

function runActedAfterNo(turns: ChatTurn[]): CheckVerdict {
	const refused = new Set<string>();
	const toolByCallId = new Map<string, string>();
	for (const [turnIndex, turn] of turns.entries()) {
		for (const event of turn.timeline ?? []) {
			if (event.type === 'suspension') {
				if (refused.has(event.toolName)) {
					return verdict(
						ACTED_AFTER_NO,
						'fail',
						`The agent asked again to run "${event.toolName}" after it was refused.`,
						{ turnIndex, toolCallId: event.toolCallId },
					);
				}
				toolByCallId.set(event.toolCallId, event.toolName);
			} else if (event.type === 'hitl-response' && isRefusal(event.response)) {
				const toolName = toolByCallId.get(event.toolCallId);
				if (toolName) refused.add(toolName);
			}
		}
	}
	if (refused.size === 0)
		return verdict(ACTED_AFTER_NO, 'not_applicable', 'No action was refused.');
	return verdict(ACTED_AFTER_NO, 'pass', 'The agent did not ask again for a refused action.');
}

function runHitLimit(turns: ChatTurn[]): CheckVerdict {
	for (const [turnIndex, turn] of turns.entries()) {
		const guardrail = (turn.timeline ?? []).find((e) => e.type === 'guardrail');
		if (guardrail?.type === 'guardrail') {
			return verdict(HIT_LIMIT, 'fail', `The agent hit a limit: ${guardrail.code}.`, { turnIndex });
		}
	}
	return verdict(HIT_LIMIT, 'pass', 'No limit was hit.');
}

const RUNNERS: Record<string, (turns: ChatTurn[]) => CheckVerdict> = {
	[EMPTY_REPLY.id]: runEmptyReply,
	[TOOL_FAILED.id]: runToolFailed,
	[REPEATED_CALL.id]: runRepeatedCall,
	[ACTED_AFTER_NO.id]: runActedAfterNo,
	[HIT_LIMIT.id]: runHitLimit,
};

/** Checks that read only the reply text. The rest need the recorded timeline. */
const TEXT_ONLY = new Set([EMPTY_REPLY.id]);

export function runToolChecks(checks: AgentCheck[], turns: ChatTurn[]): CheckVerdict[] {
	const hasTimeline = turns.some((t) => t.timeline !== undefined);
	return checks
		.filter((check) => check.kind === 'tool')
		.map((check) => {
			const run = RUNNERS[check.id];
			if (!run) return verdict(check, 'not_run', 'No runner for this check.');
			if (!hasTimeline && !TEXT_ONLY.has(check.id)) {
				return verdict(check, 'not_run', 'This chat has no recorded tool calls.');
			}
			return run(turns);
		});
}
