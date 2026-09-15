import { types } from 'node:util';

import type { WorkflowData } from '../types';
import { ExpressionError } from '../types';

export type TransferProbe = (value: unknown) => boolean;

const MAX_DEPTH = 128;
const MAX_PROBES = 10_000;

interface TransferRejection {
	path: string;
	descriptor?: string;
}

interface Member {
	path: string;
	key: string;
	descriptor: PropertyDescriptor;
}

interface WalkState {
	probe: TransferProbe;
	seen: Set<object>;
	probesLeft: number;
	exhausted: boolean;
}

const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;

function childPath(path: string, key: string): string {
	return path === '' ? key : `${path}.${key}`;
}

function isBinary(value: unknown): boolean {
	return (
		ArrayBuffer.isView(value) || types.isArrayBuffer(value) || types.isSharedArrayBuffer(value)
	);
}

function alwaysTransferable(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	const kind = typeof value;
	if (kind === 'string' || kind === 'number' || kind === 'boolean') return true;
	return isBinary(value);
}

function describe(value: unknown): string | undefined {
	switch (typeof value) {
		case 'function':
			return 'a function';
		case 'symbol':
			return 'a symbol';
		case 'bigint':
			return 'a bigint';
		default:
			break;
	}
	if (value === null || typeof value !== 'object') return undefined;
	if (types.isProxy(value)) return 'a proxy';
	if (types.isPromise(value)) return 'a promise';
	if (types.isWeakMap(value)) return 'a WeakMap';
	if (types.isWeakSet(value)) return 'a WeakSet';
	if (types.isMap(value)) return 'a Map';
	if (types.isSet(value)) return 'a Set';
	return undefined;
}

function accepts(state: WalkState, value: unknown): boolean {
	if (alwaysTransferable(value)) return true;
	if (state.probesLeft <= 0) {
		state.exhausted = true;
		return true;
	}
	state.probesLeft -= 1;
	try {
		return state.probe(value);
	} catch {
		return false;
	}
}

function acceptsAccessor(state: WalkState, key: string, descriptor: PropertyDescriptor): boolean {
	let holder: object;
	try {
		holder = Object.defineProperty({}, key, descriptor);
	} catch {
		return false;
	}
	return accepts(state, holder);
}

function ownMembers(value: object, path: string): Member[] | undefined {
	let keys: string[];
	try {
		keys = Object.keys(value);
	} catch {
		return undefined;
	}
	const indexed = Array.isArray(value);
	const members: Member[] = [];
	for (const key of keys) {
		let descriptor: PropertyDescriptor | undefined;
		try {
			descriptor = Object.getOwnPropertyDescriptor(value, key);
		} catch {
			return undefined;
		}
		if (descriptor === undefined) continue;
		members.push({
			path: indexed && ARRAY_INDEX.test(key) ? `${path}[${key}]` : childPath(path, key),
			key,
			descriptor,
		});
	}
	return members;
}

function walk(
	value: unknown,
	path: string,
	depth: number,
	state: WalkState,
): TransferRejection | undefined {
	if (state.exhausted) return undefined;
	if (value === null || typeof value !== 'object') return { path, descriptor: describe(value) };
	if (types.isProxy(value)) return { path, descriptor: 'a proxy' };
	if (state.seen.has(value)) return { path, descriptor: 'a circular reference' };
	if (depth >= MAX_DEPTH) {
		state.exhausted = true;
		return undefined;
	}
	state.seen.add(value);

	const members = ownMembers(value, path);
	if (members === undefined) return { path, descriptor: describe(value) };

	for (const member of members) {
		if (!('value' in member.descriptor)) {
			const accepted = acceptsAccessor(state, member.key, member.descriptor);
			if (state.exhausted) return undefined;
			if (!accepted) return { path: member.path, descriptor: 'a getter' };
			continue;
		}
		const child: unknown = member.descriptor.value;
		const accepted = accepts(state, child);
		if (state.exhausted) return undefined;
		if (accepted) continue;
		const deeper = walk(child, member.path, depth + 1, state);
		if (state.exhausted) return undefined;
		return deeper ?? { path: member.path, descriptor: describe(child) };
	}
	return { path, descriptor: describe(value) };
}

function buildError(
	nodeName: string | undefined,
	found: TransferRejection | undefined,
): ExpressionError {
	const source = nodeName === undefined ? 'an upstream node' : `node '${nodeName}'`;
	const where =
		found === undefined || found.path === '' ? 'the item' : `the value at ${found.path}`;
	const cause = found?.descriptor === undefined ? '' : ` (${found.descriptor})`;
	return new ExpressionError(
		`Can't read item from ${source}: ${where} cannot be used in an expression${cause}`,
		nodeName === undefined ? {} : { nodeCause: nodeName },
	);
}

function nodeNameForCall(rawMsg: unknown, data: WorkflowData): string | undefined {
	if (
		typeof rawMsg === 'object' &&
		rawMsg !== null &&
		'nodeName' in rawMsg &&
		typeof rawMsg.nodeName === 'string'
	) {
		return rawMsg.nodeName;
	}
	try {
		const prevNode: unknown = data.$prevNode;
		if (
			typeof prevNode === 'object' &&
			prevNode !== null &&
			'name' in prevNode &&
			typeof prevNode.name === 'string'
		) {
			return prevNode.name;
		}
	} catch {}
	return undefined;
}

export function untransferableItemError(
	value: unknown,
	probe: TransferProbe,
	rawMsg: unknown,
	data: WorkflowData,
): ExpressionError {
	try {
		const state: WalkState = {
			probe,
			seen: new Set<object>(),
			probesLeft: MAX_PROBES,
			exhausted: false,
		};
		return buildError(nodeNameForCall(rawMsg, data), walk(value, '', 0, state));
	} catch {
		return buildError(undefined, undefined);
	}
}
