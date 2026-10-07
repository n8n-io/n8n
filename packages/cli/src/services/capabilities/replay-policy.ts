/**
 * Replay policy for journalled tool calls.
 *
 * Before a tool runs, the journal records an "intent". After the tool runs, the journal
 * records the outcome. On resume, these rules decide what to do with a call that has a record.
 * A call that has an intent but no outcome re-runs only when it is safe to run twice.
 */

import type { ToolDefinition } from '@/modules/mcp/mcp.types';

export type ReplayPolicy = 'safe' | 'unsafe';

export type JournalStatus = 'intent' | 'completed' | 'failed';

export type JournalRecord = { status: JournalStatus; replay: ReplayPolicy };

export type JournalAction = 'run' | 'return-result' | 'return-error' | 'return-interrupted';

/** The MCP tool hints that decide the replay policy. */
export type ToolReplayAnnotations = Pick<
	NonNullable<ToolDefinition['config']['annotations']>,
	'readOnlyHint' | 'idempotentHint' | 'destructiveHint'
>;

/** Text the model sees for an interrupted call (en-GB, no internals). */
export const INTERRUPTED_TOOL_MESSAGE =
	'This action was interrupted. It may or may not have happened. Check its current state before you try it again.';

/** Replay policy from MCP tool annotations: read-only or idempotent tools are safe to re-run. */
export function replayPolicyFromAnnotations(annotations?: ToolReplayAnnotations): ReplayPolicy {
	// Compare with `true` because MCP hints are optional and servers can send other values.
	const repeatable = annotations?.readOnlyHint === true || annotations?.idempotentHint === true;
	// A destructive hint always wins, also when a server marks the tool idempotent.
	const destructive = annotations?.destructiveHint === true;
	return repeatable && !destructive ? 'safe' : 'unsafe';
}

export function decideJournalAction(
	existing: JournalRecord | undefined,
	current: ReplayPolicy,
): JournalAction {
	// No record means the call never started, so it can run.
	if (!existing) return 'run';

	switch (existing.status) {
		case 'completed':
			return 'return-result';
		case 'failed':
			return 'return-error';
		case 'intent':
			// The tool can have had an effect. Re-run only when the policy at intent time
			// and the policy now both allow it.
			return existing.replay === 'safe' && current === 'safe' ? 'run' : 'return-interrupted';
		default:
			// A record in an unknown state can have had an effect, so never re-run it.
			return 'return-interrupted';
	}
}
