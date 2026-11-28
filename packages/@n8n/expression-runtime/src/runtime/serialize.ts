import { prepareObject } from './prepare-object';
import { prepareWithOptions, type PrepareTransferOptions } from './prepare-transfer';
import { encodeOnce, newObjectWalk, type ObjectWalk } from './transfer';

export type { PrepareTransferOptions } from './prepare-transfer';

const FAST_TRANSFER_DEPTH = 32;

/** Prepare a result for structured clone. QuickJS can opt into cycle tracking. */
export function __prepareForTransfer(value: unknown, options?: PrepareTransferOptions): unknown {
	return options === undefined
		? prepareValue(value, undefined, 0)
		: prepareWithOptions(value, options);
}

function prepareValue(value: unknown, walk: ObjectWalk | undefined, depth: number): unknown {
	if (
		walk !== undefined &&
		(typeof value === 'function' || typeof value === 'symbol' || value instanceof Promise)
	) {
		return undefined;
	}
	if (value === null || typeof value !== 'object') {
		return value;
	}
	// Deep results use a cycle guard before recursive copies can exhaust the native stack.
	// Keep the common path free of reference maps. This does not limit valid result depth.
	if (walk === undefined && depth === FAST_TRANSFER_DEPTH) {
		return prepareWithOptions(value, {});
	}
	const errorWalk = walk ?? (value instanceof Error ? newObjectWalk() : undefined);
	const childDepth = depth + 1;
	if (errorWalk !== undefined) {
		return encodeOnce(value, errorWalk, (object) =>
			prepareObject(object, (child) => prepareValue(child, errorWalk, childDepth)),
		);
	}
	return prepareObject(value, (child) => prepareValue(child, undefined, childDepth));
}
