/**
 * The lanes of the worker pool (`docs/isolation.md`).
 *
 * A step that blocks the event loop of a worker delays every other step in
 * that worker. The pool keeps such steps apart: a step whose key is marked
 * runs in the slow lane, alone in a worker, where it delays only other marked
 * steps.
 *
 * The key of a step is its workflow id and its step name. The runtime sends
 * both with the step. The key holds no data of the workflow.
 */

/**
 * - `slow`: a step with this key blocked a worker. Its steps run in the slow lane.
 * - `probe`: a step with this key was in a worker that the CPU guard stopped.
 *   Its next step runs in the slow lane, which shows if the key is the cause.
 * - `maybe`: a step with this key was in a worker when a step blocked it for
 *   a short time. One next step runs in the slow lane when a worker is free
 *   there. The key does not wait for it: most such keys are not the cause.
 * - `clear`: a step with this key ran alone and did not block.
 */
export type Lane = 'slow' | 'probe' | 'maybe' | 'clear';

/** `must`: the step waits for the slow lane. `try`: it runs there when a worker is free. */
export type SlowNeed = 'must' | 'try' | 'no';

export interface LaneChange {
	key: string;
	lane: Lane;
	/** When the mark ends, in milliseconds since the epoch. */
	until: number;
}

export interface LaneTableOptions {
	/** The most keys in the table. The oldest mark goes first. */
	max: number;
	/** How long a `slow` or `probe` mark lasts. */
	slowTtlMs: number;
	/** How long a `clear` mark lasts. */
	clearTtlMs: number;
}

/** The key of a step: the workflow id and the step name. */
export function laneKey(workflowId: string | undefined, step: string): string {
	return `${workflowId ?? ''}\n${step}`;
}

/** The workflow id of a key. Steps without one share the empty id. */
export function workflowOfKey(key: string): string {
	const end = key.indexOf('\n');
	return end < 0 ? '' : key.slice(0, end);
}

/** If a step with this mark runs in the slow lane. */
export function slowNeed(
	lane: Lane | undefined,
	kind: 'code' | 'node',
	codeStartsSlow: boolean,
): SlowNeed {
	if (lane === 'slow' || lane === 'probe') return 'must';
	if (lane === 'maybe') return 'try';
	if (lane === 'clear') return 'no';
	// Code of a workflow author is not known until it ran once alone.
	return kind === 'code' && codeStartsSlow ? 'try' : 'no';
}

/** The marks of the keys, with a fixed maximum. */
export class LaneTable {
	private readonly marks = new Map<string, { lane: Lane; until: number }>();

	constructor(private readonly options: LaneTableOptions) {}

	get size(): number {
		return this.marks.size;
	}

	get(key: string, now: number): Lane | undefined {
		const mark = this.marks.get(key);
		if (!mark) return undefined;
		if (mark.until > now) return mark.lane;
		this.marks.delete(key);
		return undefined;
	}

	/** The marks that have not ended, for a new worker. */
	entries(now: number): LaneChange[] {
		const list: LaneChange[] = [];
		for (const [key, mark] of this.marks) {
			if (mark.until > now) list.push({ key, lane: mark.lane, until: mark.until });
			else this.marks.delete(key);
		}
		return list;
	}

	/**
	 * A worker of the normal lane was blocked while steps with `keys` ran in
	 * it. `complete`: `keys` holds every key that ran there. `stopped`: the
	 * CPU guard stopped the worker. One key that can be the cause is `slow`.
	 * Several keys are each `probe` after a stop, and `maybe` after a block
	 * that ended.
	 */
	suspects(keys: string[], complete: boolean, stopped: boolean, now: number): LaneChange[] {
		// A `clear` mark does not excuse a key: its steps can block for other data.
		const mark: Lane = complete && keys.length === 1 ? 'slow' : stopped ? 'probe' : 'maybe';
		const rank = { clear: 0, maybe: 1, probe: 2, slow: 3 };
		const changes: LaneChange[] = [];
		for (const key of keys) {
			const before = this.get(key, now);
			if (before !== undefined && rank[before] >= rank[mark]) continue;
			changes.push(this.set(key, mark, now));
		}
		return changes;
	}

	/** A step with `key` ran alone in the slow lane. `blocked`: it blocked its worker. */
	ran(key: string, blocked: boolean, now: number): LaneChange | undefined {
		if (blocked) return this.set(key, 'slow', now);
		// A key that blocked before stays slow until its mark ends.
		if (this.get(key, now) === 'slow') return undefined;
		return this.set(key, 'clear', now);
	}

	private set(key: string, lane: Lane, now: number): LaneChange {
		const ttl = lane === 'clear' ? this.options.clearTtlMs : this.options.slowTtlMs;
		// A key that is set again moves to the end: the first key is the oldest.
		this.marks.delete(key);
		if (this.marks.size >= this.options.max) {
			for (const oldest of this.marks.keys()) {
				this.marks.delete(oldest);
				break;
			}
		}
		const until = now + ttl;
		this.marks.set(key, { lane, until });
		return { key, lane, until };
	}
}

/**
 * The steps that wait for a worker of the slow lane. The workflows take
 * turns, so a workflow with many steps does not delay the step of another
 * workflow by more than one step for each worker. The queue has a fixed
 * maximum, and one workflow gets at most half of it.
 */
export class SlowQueue<T> {
	private readonly byWorkflow = new Map<string, T[]>();

	private count = 0;

	constructor(private readonly max: number) {}

	get size(): number {
		return this.count;
	}

	/** False when the queue, or the part of this workflow, is full. */
	push(workflow: string, item: T): boolean {
		if (this.count >= this.max) return false;
		const list = this.byWorkflow.get(workflow);
		if (!list) {
			this.byWorkflow.set(workflow, [item]);
		} else {
			if (list.length >= Math.max(1, Math.floor(this.max / 2))) return false;
			list.push(item);
		}
		this.count += 1;
		return true;
	}

	/** The next step: the first one of the workflow that waited longest for its turn. */
	shift(): T | undefined {
		for (const [workflow, list] of this.byWorkflow) {
			const item = list.shift();
			this.byWorkflow.delete(workflow);
			// The workflow goes to the end of the turn order.
			if (list.length > 0) this.byWorkflow.set(workflow, list);
			if (item === undefined) continue;
			this.count -= 1;
			return item;
		}
		return undefined;
	}

	/** Removes and returns the steps that `drop` selects. */
	remove(drop: (item: T) => boolean): T[] {
		const removed: T[] = [];
		for (const [workflow, list] of this.byWorkflow) {
			const kept = list.filter((item) => {
				if (!drop(item)) return true;
				removed.push(item);
				return false;
			});
			if (kept.length === 0) this.byWorkflow.delete(workflow);
			else if (kept.length !== list.length) list.splice(0, list.length, ...kept);
		}
		this.count -= removed.length;
		return removed;
	}
}
