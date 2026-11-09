import isEqual from 'lodash/isEqual';

import { heldResult, standInFromOutput } from '@/modules/agents/json-config/test-sandbox';

import type { PinnedToolCall } from './saved-test-case';

/**
 * How a replayed call was answered. `exact`: a saved call with the same input.
 * `close`: the next unused saved call of that tool. `held`: an action with no
 * saved call left, answered like the test-chat sandbox. `none`: a read with no
 * saved data, so the run can no longer stand for the saved one.
 */
export type ReplayMatch = 'exact' | 'close' | 'held' | 'none';

export interface ReplayEvent {
	tool: string;
	input: unknown;
	match: ReplayMatch;
}

export const NO_SAVED_DATA_MESSAGE =
	'Test replay: there is no saved data for this call, so it was not run.';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Answers the agent's own tools from the calls a saved test recorded, so a
 * re-run sees the same data the saved run saw and no real system is called.
 * Each saved call answers once. One replay serves one run.
 */
export class ToolReplay {
	private readonly used = new Set<number>();

	private readonly recorded: ReplayEvent[] = [];

	constructor(
		private readonly saved: readonly PinnedToolCall[],
		private readonly tools: { ownTools: ReadonlySet<string>; actingTools: ReadonlySet<string> },
	) {}

	/** Built-in, MCP and web-search tools are not the agent's own and keep their usual path. */
	replays(tool: string): boolean {
		return this.tools.ownTools.has(tool);
	}

	answer(tool: string, input: unknown): unknown {
		const exact = this.find((call) => call.tool === tool && isEqual(call.input, input));
		if (exact !== undefined) return this.use(exact, tool, input, 'exact');

		const close = this.find((call) => call.tool === tool);
		if (close !== undefined) return this.use(close, tool, input, 'close');

		if (this.tools.actingTools.has(tool)) {
			this.recorded.push({ tool, input, match: 'held' });
			const lastOutput = [...this.saved].reverse().find((call) => call.tool === tool)?.output;
			return heldResult(lastOutput === undefined ? undefined : standInFromOutput(lastOutput));
		}

		this.recorded.push({ tool, input, match: 'none' });
		return { error: NO_SAVED_DATA_MESSAGE };
	}

	get events(): readonly ReplayEvent[] {
		return this.recorded;
	}

	/** A read with no saved data: the run went where the saved test has no data. */
	get offScript(): boolean {
		return this.recorded.some((event) => event.match === 'none');
	}

	get offScriptTools(): string[] {
		return [...new Set(this.recorded.filter((e) => e.match === 'none').map((event) => event.tool))];
	}

	private find(predicate: (call: PinnedToolCall) => boolean): number | undefined {
		const index = this.saved.findIndex((call, i) => !this.used.has(i) && predicate(call));
		return index === -1 ? undefined : index;
	}

	private use(index: number, tool: string, input: unknown, match: 'exact' | 'close'): unknown {
		this.used.add(index);
		this.recorded.push({ tool, input, match });
		return this.saved[index].output;
	}
}

/**
 * The saved tool calls of a test case, from its `tool_data` cell. Null when the
 * case has none to replay: a hand-written case, or a cell that is not a list.
 * An empty list is kept: the saved run called no tools.
 */
export function readPinnedToolCalls(cell: unknown): PinnedToolCall[] | null {
	if (typeof cell !== 'string' || cell.trim() === '') return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(cell);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	return parsed.flatMap((entry) =>
		isRecord(entry) && typeof entry.tool === 'string'
			? [{ tool: entry.tool, input: entry.input, output: entry.output }]
			: [],
	);
}
