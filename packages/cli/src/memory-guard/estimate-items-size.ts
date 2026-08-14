import type { INodeExecutionData } from 'n8n-workflow';

/** Max items measured directly per output; larger outputs are sampled. */
const SAMPLE_SIZE = 10;

/** Max values visited per output, to bound walk cost on pathological shapes. */
const WALK_BUDGET = 10_000;

/** Max nesting depth visited, to bound recursion on pathological shapes. */
const MAX_DEPTH = 64;

interface WalkState {
	budget: number;
	seen: WeakSet<object>;
}

/**
 * Estimate the retained size in bytes of a node output. Walks values instead of
 * serializing them: reading a string's length is O(1) regardless of its size, so
 * cost scales with field count, not bytes. Outputs with many same-shaped items
 * are sampled and extrapolated. Objects already counted for this execution
 * (items pass by reference through pass-through nodes) contribute zero.
 */
export function estimateItemsSize(items: INodeExecutionData[], seen: WeakSet<object>): number {
	if (items.length === 0) return 0;

	const state: WalkState = { budget: WALK_BUDGET, seen };

	if (items.length <= SAMPLE_SIZE) {
		let bytes = 0;
		for (const item of items) bytes += estimateItemSize(item, state);
		return bytes;
	}

	const step = Math.floor(items.length / SAMPLE_SIZE);
	let sampledBytes = 0;
	for (let i = 0; i < items.length; i += step) {
		sampledBytes += estimateItemSize(items[i], state);
	}
	const sampleCount = Math.ceil(items.length / step);
	return Math.round((sampledBytes / sampleCount) * items.length);
}

function estimateItemSize(item: INodeExecutionData, state: WalkState): number {
	let bytes = 0;

	if (item.json !== null && typeof item.json === 'object') {
		bytes += walkSize(item.json, state, 0);
	}

	if (item.binary) {
		for (const binary of Object.values(item.binary)) {
			if (typeof binary.data === 'string') bytes += binary.data.length * 2;
		}
	}

	return bytes;
}

function walkSize(value: unknown, state: WalkState, depth: number): number {
	if (state.budget <= 0 || depth > MAX_DEPTH) return 0;
	state.budget--;

	if (typeof value === 'string') return value.length * 2;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return 8;
	}
	if (value === null || value === undefined || typeof value !== 'object') return 0;

	if (state.seen.has(value)) return 0;
	state.seen.add(value);

	let bytes = 0;
	if (Array.isArray(value)) {
		for (const entry of value) {
			if (state.budget <= 0) break;
			bytes += walkSize(entry, state, depth + 1);
		}
		return bytes;
	}

	for (const [key, entry] of Object.entries(value)) {
		if (state.budget <= 0) break;
		bytes += key.length * 2 + walkSize(entry, state, depth + 1);
	}
	return bytes;
}
