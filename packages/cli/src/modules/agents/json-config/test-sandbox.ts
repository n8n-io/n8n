import type { BuiltTool } from '@n8n/agents';

import type { TimelineEvent } from '../execution-recorder';

/**
 * The test chat's sandbox: a tool that changes something is not run while the
 * author tests. The agent gets a held result instead, shaped like the tool's
 * last real output when there is one, so it can finish its reply. Every value
 * in that shape is a placeholder: a past output belongs to another session.
 */

export const HELD_MESSAGE =
	'Not run: test mode. Continue as if it succeeded. Any values in "result" are placeholders.';

export interface HeldResult {
	testMode: true;
	status: 'held';
	message: string;
	result?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The shape of a real output with every value replaced. */
export function standInFromOutput(output: unknown, key = 'value'): unknown {
	if (Array.isArray(output)) {
		return output.length === 0 ? [] : [standInFromOutput(output[0], key)];
	}
	if (isRecord(output)) {
		return Object.fromEntries(
			Object.entries(output).map(([name, value]) => [name, standInFromOutput(value, name)]),
		);
	}
	if (typeof output === 'string') return `test-${key}`;
	if (typeof output === 'number') return 0;
	return output;
}

export function heldResult(standIn: unknown): HeldResult {
	return {
		testMode: true,
		status: 'held',
		message: HELD_MESSAGE,
		...(standIn === undefined ? {} : { result: standIn }),
	};
}

export function isHeldOutput(output: unknown): output is HeldResult {
	return isRecord(output) && output.testMode === true && output.status === 'held';
}

/**
 * The latest output of each tool from runs that really happened. A call that
 * failed, was declined, or was held in a test has nothing real to copy.
 */
export function lastRealOutputs(timelines: TimelineEvent[][]): Map<string, unknown> {
	const outputs = new Map<string, unknown>();
	for (const timeline of timelines) {
		for (const event of timeline) {
			if (event.type !== 'tool-call' || !event.success || event.canceled) continue;
			const output = event.output;
			if (isHeldOutput(output)) continue;
			if (isRecord(output) && (output.declined === true || output.status === 'error')) continue;
			if (output === undefined || output === null) continue;
			outputs.set(event.name, output);
		}
	}
	return outputs;
}

/**
 * A test re-run's stand-in for the agent's own tools: each claimed tool answers
 * from a saved test's data instead of running.
 */
export interface ToolReplayHook {
	replays(toolName: string): boolean;
	answer(toolName: string, input: unknown): unknown;
}

/** The same tool as the agent sees it, answering with `result` and never running. */
export function wrapToolForTestSandbox(tool: BuiltTool, result: HeldResult): BuiltTool {
	return {
		...tool,
		handler: async () => await Promise.resolve(result),
	};
}
