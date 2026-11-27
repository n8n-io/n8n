import {
	isArray,
	mapDelete,
	mapGet,
	mapHas,
	mapSet,
	NativeMap,
	NativeSet,
	reflectApply,
	setAdd,
	setDelete,
	setHas,
} from './intrinsics';
import { prepareObject } from './prepare-object';
import { isPlainObject } from './transfer';

export interface PrepareTransferOptions {
	/** Report Error markers whose fields were not cut by an enclosing cycle. */
	onEncodeError?: (error: Error, sentinel: object) => void;
	/** Stop a plain object or array cycle outside an Error. The default throws a RangeError. */
	onPlainCycle?: () => never;
}

function rejectPlainCycle(): never {
	throw new RangeError('Maximum call stack size exceeded');
}

/** Keep the QuickJS traversal state out of the structured-clone path. */
export function prepareWithOptions(value: unknown, options: PrepareTransferOptions): unknown {
	const open = new NativeSet<object>();
	const onPlainCycle = options.onPlainCycle ?? rejectPlainCycle;
	const prepare = (child: unknown): unknown => {
		if (child === null || typeof child !== 'object') {
			return child;
		}
		if (child instanceof Error) {
			return new ErrorWalk(options.onEncodeError).prepare(child);
		}
		if (!isArray(child) && !isPlainObject(child)) {
			return prepareObject(child, prepare);
		}
		if (reflectApply(setHas, open, [child])) {
			onPlainCycle();
		}
		reflectApply(setAdd, open, [child]);
		try {
			return prepareObject(child, prepare);
		} finally {
			reflectApply(setDelete, open, [child]);
		}
	};
	return prepare(value);
}

/** Cut Error cycles without reusing markers that lost fields to an ancestor. */
class ErrorWalk {
	private readonly done = new NativeMap<object, unknown>();
	private readonly open = new NativeMap<object, number>();
	private readonly cut = new NativeMap<object, number>();
	private readonly cuts: number[] = [];
	private sequence = 0;

	constructor(private readonly onEncodeError: PrepareTransferOptions['onEncodeError']) {}

	private recordCut(id: number): void {
		const top = this.cuts.length - 1;
		if (top >= 0 && id < this.cuts[top]) {
			this.cuts[top] = id;
		}
	}

	prepare(value: unknown): unknown {
		if (typeof value === 'function' || typeof value === 'symbol' || value instanceof Promise) {
			return undefined;
		}
		if (value === null || typeof value !== 'object') {
			return value;
		}
		const openId: unknown = reflectApply(mapGet, this.open, [value]);
		if (typeof openId === 'number') {
			this.recordCut(openId);
			return undefined;
		}
		if (reflectApply(mapHas, this.done, [value])) {
			const cachedCut: unknown = reflectApply(mapGet, this.cut, [value]);
			if (typeof cachedCut === 'number') {
				this.recordCut(cachedCut);
			}
			return reflectApply(mapGet, this.done, [value]);
		}
		const id = ++this.sequence;
		reflectApply(mapSet, this.open, [value, id]);
		this.cuts[this.cuts.length] = Infinity;
		let encoded: unknown;
		let minCut: number;
		try {
			encoded = prepareObject(value, (child) => this.prepare(child));
		} finally {
			minCut = this.cuts[this.cuts.length - 1];
			this.cuts.length--;
			reflectApply(mapDelete, this.open, [value]);
		}
		if (minCut < id) {
			reflectApply(mapSet, this.cut, [value, minCut]);
			this.recordCut(minCut);
		}
		reflectApply(mapSet, this.done, [value, encoded]);
		if (value instanceof Error && minCut >= id && encoded !== null && typeof encoded === 'object') {
			this.onEncodeError?.(value, encoded);
		}
		return encoded;
	}
}
