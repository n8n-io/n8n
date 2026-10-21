import { types } from 'node:util';
import type {
	INodeExecutionData,
	IPairedItemData,
	IRunData,
	ITaskData,
	ITaskDataConnections,
} from 'n8n-workflow';

/** Max entries measured per array or list of items. Larger ones are sampled and extrapolated. */
const ARRAY_SAMPLE_SIZE = 10;

/**
 * Max values measured per object. Higher than for arrays, because the fields of a
 * record differ in size, and objects with more keys are usually maps that sample well.
 */
const OBJECT_SAMPLE_SIZE = 100;

/** Max entries measured per node output, to bound the cost of any one estimate. */
const WALK_BUDGET = 10_000;

/** Max nesting depth expanded, to bound recursion. */
const MAX_DEPTH = 64;

/**
 * Byte sizes follow V8's heap layout. A tagged slot is 4 bytes with pointer
 * compression, else 8. An object is a header of three slots plus one slot per
 * property, an array is a header of six slots plus one slot per element, and a
 * string is a header plus one byte per character, as V8 stores most strings.
 * Small integers live inline in a slot, other numbers in a separate heap object.
 * Property names are not counted, because V8 shares them across objects.
 */
const buildVariables: Record<string, unknown> = process.config.variables;
const POINTER_COMPRESSION = Boolean(buildVariables.v8_enable_pointer_compression);
const SLOT = POINTER_COMPRESSION ? 4 : 8;
const OBJECT_HEADER = 3 * SLOT;
const ARRAY_HEADER = 6 * SLOT;
const STRING_HEADER = SLOT + 8;
const HEAP_NUMBER = SLOT + 8;
const SMALL_INTEGER_MAX = POINTER_COMPRESSION ? 2 ** 30 - 1 : 2 ** 31 - 1;
const SMALL_INTEGER_MIN = -SMALL_INTEGER_MAX - 1;

/**
 * The engine wraps every input item in a new object with a new `pairedItem` before
 * a node runs, and run data keeps the wrappers. Measured on a V8 heap.
 */
const ITEM_WRAPPER = 15 * SLOT;

/*
 * Known gaps, which make this an estimate:
 * - A string held by several objects counts once for each, for example after a
 *   node copies its input json.
 * - A node that nests many earlier items, such as Aggregate, counts again the
 *   nested objects that no earlier estimate sampled.
 * - V8 stores a string with a character outside Latin-1 at two bytes per character.
 * - V8 stores an array of decimal numbers at 8 bytes per element.
 * - V8 stores an object with many keys, such as a map keyed by id, at several slots
 *   per key, and does not share those keys.
 * - The `seen` set takes memory of its own.
 */

/** Returns the input item that an output item is paired with, if any. */
export type InputItemResolver = (item: INodeExecutionData) => INodeExecutionData | undefined;

/** One call of `sampleSum`. */
interface SampleFrame {
	/** Bytes of objects that more than one measured entry holds. */
	sharedBytes: number;
}

/** One measured entry of a `sampleSum` call, linked to the entry that contains it. */
interface EntryPath {
	frame: SampleFrame;
	parent: EntryPath | undefined;
	/** Nesting depth of the entry. The items of the node output are at depth 0. */
	depth: number;
}

/** An object counted in this node output, and where the walk counted it. */
interface CountedObject {
	bytes: number;
	path: EntryPath | undefined;
	parent: CountedObject | undefined;
	/** Calls of `sampleSum` where this object counts once, outside the extrapolation. */
	sharedIn?: Set<SampleFrame>;
	/** For each call of `sampleSum`, the bytes of objects inside this one that count there. */
	sharedInside?: Map<SampleFrame, number>;
}

interface WalkState {
	/** Objects already counted for this execution. */
	seen: WeakSet<object>;
	/** Entries measured so far for this node output, including values and repeats. */
	work: number;
	/** Whether the walk left out data because of the budget or the depth limit. */
	truncated: boolean;
	/** The measured entry that the walk is in. */
	path: EntryPath | undefined;
	/** The object that the walk is in. */
	current: CountedObject | undefined;
	/** Objects counted in this node output. */
	counted: Map<object, CountedObject>;
}

/**
 * Estimate how many bytes of new data a node run adds to an execution's run data:
 * its output and, for nodes that record one, its input override.
 *
 * Data the node passed on from its input adds only its item wrappers. `seen` holds
 * the objects already counted for the execution, so pass one `seen` per execution.
 */
export function estimateTaskDataSize(
	taskData: ITaskData,
	runData: IRunData,
	seen: WeakSet<object>,
): number {
	const inputItemOf = pairedInputResolver(taskData, runData);

	return (
		estimateConnectionsSize(taskData.data, inputItemOf, seen) +
		estimateConnectionsSize(taskData.inputOverride, inputItemOf, seen)
	);
}

/** Estimate the bytes of the input that an AI sub-node records when it starts. */
export function estimateInputSize(taskData: ITaskData, seen: WeakSet<object>): number {
	return estimateConnectionsSize(taskData.inputOverride, () => undefined, seen);
}

function estimateConnectionsSize(
	connections: ITaskDataConnections | undefined,
	inputItemOf: InputItemResolver,
	seen: WeakSet<object>,
): number {
	if (!connections) return 0;

	let bytes = 0;
	for (const outputs of Object.values(connections)) {
		for (const items of outputs) {
			if (items) bytes += estimateItemsSize(items, seen, inputItemOf);
		}
	}
	return bytes;
}

/**
 * Nodes that filter, sort, route, or merge return their input items with the same
 * `json` object, and the engine pairs each input item with its place in the previous
 * output. Comparing by identity means a wrong pairing can only count an item as new.
 */
function pairedInputResolver(taskData: ITaskData, runData: IRunData): InputItemResolver {
	return (item) => {
		const pair = firstPair(item.pairedItem);
		if (!pair) return undefined;

		// A loop node that feeds its own output back sets the real source here.
		const source = pair.sourceOverwrite ?? taskData.source?.[pair.input ?? 0];
		if (!source) return undefined;

		const sourceRun = runData[source.previousNode]?.[source.previousNodeRun ?? 0];
		return sourceRun?.data?.main?.[source.previousNodeOutput ?? 0]?.[pair.item];
	};
}

function firstPair(pairedItem: INodeExecutionData['pairedItem']): IPairedItemData | undefined {
	const pair = Array.isArray(pairedItem) ? pairedItem[0] : pairedItem;
	return typeof pair === 'number' ? { item: pair } : pair;
}

/**
 * Estimate the bytes of new data in one node output, without serializing it. Large
 * outputs and arrays are sampled, so the cost does not grow with the item count.
 */
export function estimateItemsSize(
	items: INodeExecutionData[],
	seen: WeakSet<object>,
	inputItemOf: InputItemResolver = () => undefined,
): number {
	const state: WalkState = {
		seen,
		work: 0,
		truncated: false,
		path: undefined,
		current: undefined,
		counted: new Map(),
	};

	const dataBytes = sampleSum(items.length, state, (index) => {
		const item = items[index];
		const input = inputItemOf(item);
		// Binary entries are small, so measure them before the json can use up the budget.
		const binaryBytes = item.binary === input?.binary ? 0 : valueSize(item.binary, state);
		const jsonBytes = item.json === input?.json ? 0 : valueSize(item.json, state);
		return binaryBytes + jsonBytes;
	});
	return items.length * ITEM_WRAPPER + dataBytes;
}

/**
 * Sum the sizes of `count` entries from an evenly spaced sample of at most
 * `sampleSize`. Each measured entry may use all budget left, so the walk runs out on
 * the last entries, not on every entry. The extrapolation leaves out cut-off entries,
 * which count only part of their data, and objects that several entries hold. After
 * the budget is spent, the walk still measures the cheap remaining entries of open
 * calls, so that it sees repeated references.
 */
function sampleSum(
	count: number,
	state: WalkState,
	measureAt: (index: number) => number,
	sampleSize = ARRAY_SAMPLE_SIZE,
): number {
	const sampled = Math.min(count, sampleSize);
	if (sampled === 0) return 0;

	const frame: SampleFrame = { sharedBytes: 0 };
	const pathBefore = state.path;
	const truncatedBefore = state.truncated;
	let allBytes = 0;
	let completeBytes = 0;
	let complete = 0;
	for (let i = 0; i < sampled; i++) {
		state.work++;
		state.path = { frame, parent: pathBefore, depth: pathBefore ? pathBefore.depth + 1 : 0 };
		state.truncated = false;
		const bytes = measureAt(sampleIndex(i, count, sampled));
		allBytes += bytes;
		if (!state.truncated) {
			completeBytes += bytes;
			complete++;
		}
	}
	state.path = pathBefore;
	state.truncated = truncatedBefore || complete === 0;

	// Scaling a cut-off entry would compound at every level of a deep structure.
	if (complete === 0) return allBytes;

	const perEntry = Math.max(0, completeBytes - frame.sharedBytes);
	return frame.sharedBytes + Math.round((perEntry / complete) * count);
}

function sampleIndex(i: number, count: number, measured: number) {
	return Math.floor((i * count) / measured);
}

function valueSize(value: unknown, state: WalkState): number {
	if (typeof value === 'string') return STRING_HEADER + value.length;
	if (typeof value === 'number') {
		const isSmallInteger =
			Number.isInteger(value) && value >= SMALL_INTEGER_MIN && value <= SMALL_INTEGER_MAX;
		return isSmallInteger ? 0 : HEAP_NUMBER;
	}
	if (typeof value !== 'object' || value === null) return 0;

	// A proxy trap is node code, like a getter. Count only the slot that holds the proxy.
	if (types.isProxy(value)) return 0;

	if (state.seen.has(value)) {
		const counted = state.counted.get(value);
		if (counted) markShared(counted, state);
		return 0;
	}

	// Leave an object unmarked when it is not expanded, so a later node can still count it.
	if (state.work >= WALK_BUDGET || (state.path?.depth ?? 0) > MAX_DEPTH) {
		state.truncated = true;
		return 0;
	}
	state.seen.add(value);

	const counted: CountedObject = {
		bytes: 0,
		path: state.path,
		parent: state.current,
	};
	state.counted.set(value, counted);
	state.current = counted;
	counted.bytes = objectSize(value, state);
	state.current = counted.parent;

	return counted.bytes;
}

function objectSize(value: object, state: WalkState): number {
	// A view keeps its whole buffer in memory, and several views can share one buffer.
	if (ArrayBuffer.isView(value)) return valueSize(viewBuffer(value), state);

	// Read binary buffers by length. Walking their keys would visit every byte.
	if (types.isAnyArrayBuffer(value)) return value.byteLength;

	if (Array.isArray(value)) {
		const elements: readonly unknown[] = value;
		const indices = hasHoles(elements) ? Object.keys(elements) : undefined;
		const count = indices?.length ?? elements.length;
		const elementsBytes = sampleSum(count, state, (index) =>
			valueSize(dataValue(elements, indices ? indices[index] : index), state),
		);
		return ARRAY_HEADER + count * SLOT + elementsBytes;
	}

	const keys = Object.keys(value);
	const valuesBytes = sampleSum(
		keys.length,
		state,
		(index) => valueSize(dataValue(value, keys[index]), state),
		OBJECT_SAMPLE_SIZE,
	);
	return OBJECT_HEADER + keys.length * SLOT + valuesBytes;
}

/** Read an own data property without running a getter, which is node code that can block. */
function dataValue(object: object, key: string | number): unknown {
	const descriptor = Object.getOwnPropertyDescriptor(object, key);
	return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

/**
 * Count once, outside the extrapolation, an object that two measured entries of one
 * `sampleSum` call hold. It can count once in several calls, for example when one
 * item holds it twice and other items hold it too.
 */
function markShared(counted: CountedObject, state: WalkState) {
	// Climb both paths to the entries just below the deepest entry that they share.
	// Without a shared entry, the climb ends at the items of the node output.
	let countedBelow = counted.path;
	let currentBelow = state.path;
	while (countedBelow && currentBelow && countedBelow.parent !== currentBelow.parent) {
		const depth = Math.max(countedBelow.depth, currentBelow.depth);
		if (countedBelow.depth === depth) countedBelow = countedBelow.parent;
		if (currentBelow.depth === depth) currentBelow = currentBelow.parent;
	}

	// One entry on both paths, or entries of different calls inside one entry, are
	// parts of that one entry.
	if (!countedBelow || !currentBelow || countedBelow === currentBelow) return;
	if (countedBelow.frame !== currentBelow.frame) return;
	const { frame } = currentBelow;

	// An object that this call already counts once, or that is inside one, is done.
	for (let object: CountedObject | undefined = counted; object; object = object.parent) {
		if (object.sharedIn?.has(frame)) return;
	}

	// Leave out the objects inside this one that this call already counts once.
	const bytes = counted.bytes - (counted.sharedInside?.get(frame) ?? 0);
	frame.sharedBytes += bytes;
	(counted.sharedIn ??= new Set()).add(frame);
	for (let object = counted.parent; object; object = object.parent) {
		object.sharedInside ??= new Map();
		object.sharedInside.set(frame, (object.sharedInside.get(frame) ?? 0) + bytes);
	}
}

/**
 * Whether a sampled index holds no element. A key like `byId.1234567890` can make an
 * array with a huge length and almost no elements, and V8 then stores only the elements.
 */
function hasHoles(elements: readonly unknown[]): boolean {
	const measured = Math.min(elements.length, ARRAY_SAMPLE_SIZE);
	for (let i = 0; i < measured; i++) {
		if (!Object.hasOwn(elements, sampleIndex(i, elements.length, measured))) return true;
	}
	return false;
}

// Built-in getters, because a getter on the view itself is node code.
const typedArrayBuffer = Object.getOwnPropertyDescriptor(
	Object.getPrototypeOf(Uint8Array.prototype),
	'buffer',
)?.get;
const dataViewBuffer = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')?.get;

function viewBuffer(view: ArrayBufferView): unknown {
	const getBuffer = types.isDataView(view) ? dataViewBuffer : typedArrayBuffer;
	return getBuffer?.call(view);
}
