import { types } from 'node:util';

import {
	TRANSFER_MAX_DEPTH,
	TRANSFER_SANITISED_KEY,
	TRANSFER_UNUSABLE_KEY,
} from '../runtime/transfer';
import type { BridgeMessage } from './bridge-messages';
import type { WorkflowData } from '../types';
import { ExpressionError } from '../types';

export type TransferProbe = (value: unknown) => boolean;

export const MAX_DIAGNOSTIC_MS = 250;

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
	deadline: number;
	exhausted: boolean;
}

const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;
const IDENTIFIER_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function diagnosticBudgetMs(msLeft: number): number {
	if (!Number.isFinite(msLeft)) return MAX_DIAGNOSTIC_MS;
	return Math.max(0, Math.min(MAX_DIAGNOSTIC_MS, msLeft / 2));
}

function childPath(path: string, key: string): string {
	if (!IDENTIFIER_KEY.test(key)) {
		// A key holding a dot or a quote would read as nesting in dotted form.
		return `${path}['${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`;
	}
	return path === '' ? key : `${path}.${key}`;
}

function isBinary(value: unknown): boolean {
	return (
		ArrayBuffer.isView(value) || types.isArrayBuffer(value) || types.isSharedArrayBuffer(value)
	);
}

/** Values both engines take, skipped so a large buffer or string is never copied to ask. */
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
	if (types.isMap(value)) return 'a value inside a Map';
	if (types.isSet(value)) return 'a value inside a Set';
	return undefined;
}

function probe(state: WalkState, value: unknown): boolean {
	if (Date.now() > state.deadline) {
		// Report the value as accepted so the walk unwinds; `exhausted` is what the caller reads.
		state.exhausted = true;
		return true;
	}
	try {
		return state.probe(value);
	} catch {
		return false;
	}
}

function defineMember(holder: object, key: string, value: unknown): void {
	Object.defineProperty(holder, key, {
		value,
		enumerable: true,
		writable: true,
		configurable: true,
	});
}

/** Holds the owner's data properties alone, so asking about one getter never runs another. */
function dataReceiver(members: Member[]): object {
	const receiver = {};
	for (const member of members) {
		if (!('value' in member.descriptor)) continue;
		try {
			defineMember(receiver, member.key, member.descriptor.value);
		} catch {}
	}
	return receiver;
}

function memberHolder(member: Member, receiverFor: () => object): object | undefined {
	const holder = {};
	try {
		if ('value' in member.descriptor) {
			defineMember(holder, member.key, member.descriptor.value);
			return holder;
		}
		const getter = member.descriptor.get;
		if (getter === undefined) {
			return Object.defineProperty(holder, member.key, member.descriptor);
		}
		// Keep the getter's own object as its receiver, so it reads the siblings it expects.
		const receiver = receiverFor();
		return Object.defineProperty(holder, member.key, {
			enumerable: true,
			configurable: true,
			get: () => getter.call(receiver),
		});
	} catch {
		return undefined;
	}
}

function acceptsMember(state: WalkState, member: Member, receiverFor: () => object): boolean {
	if ('value' in member.descriptor && alwaysTransferable(member.descriptor.value)) return true;
	const holder = memberHolder(member, receiverFor);
	if (holder === undefined) return false;
	return probe(state, holder);
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
	if (depth >= TRANSFER_MAX_DEPTH) {
		state.exhausted = true;
		return undefined;
	}
	state.seen.add(value);

	const members = ownMembers(value, path);
	if (members === undefined) return { path, descriptor: describe(value) };

	let receiver: object | undefined;
	const receiverFor = () => (receiver ??= dataReceiver(members));

	for (const member of members) {
		if (Date.now() > state.deadline) {
			state.exhausted = true;
			return undefined;
		}
		const accepted = acceptsMember(state, member, receiverFor);
		if (state.exhausted) return undefined;
		if (accepted) continue;
		if (!('value' in member.descriptor)) return { path: member.path, descriptor: 'a getter' };
		return walk(member.descriptor.value, member.path, depth + 1, state);
	}
	return { path, descriptor: describe(value) };
}

function refusalMessage(
	subject: CallSubject,
	found: TransferRejection | undefined,
	stopped: boolean,
): string {
	let where: string;
	let cause: string;
	if (found === undefined) {
		where = stopped ? 'a value inside the item' : 'the item';
		cause = stopped ? ' (the search for it stopped early)' : '';
	} else {
		where = found.path === '' ? 'the item' : `the value at ${found.path}`;
		cause = found.descriptor === undefined ? '' : ` (${found.descriptor})`;
	}
	return `Can't read ${subject.text}: ${where} cannot be used in an expression${cause}`;
}

function buildError(
	subject: CallSubject,
	found: TransferRejection | undefined,
	stopped: boolean,
): ExpressionError {
	return new ExpressionError(
		refusalMessage(subject, found, stopped),
		subject.nodeName === undefined ? {} : { nodeCause: subject.nodeName },
	);
}

/** Host calls whose result is item data, so a refusal of it reads as an item read. */
const ITEM_CALL_TYPES = new Set<string>([
	'getNodeFirst',
	'getNodeLast',
	'getNodeAll',
	'getInputFirst',
	'getInputLast',
	'getInputAll',
	'getItems',
	'getNodePairedItem',
	'getNodeItemMatching',
	'getNodeItem',
	'getPairedItem',
] satisfies Array<BridgeMessage['type']>);

const CALL_SUBJECTS: Record<string, string> = {
	fromAi: 'the value $fromAI gave back',
	evaluateExpression: 'the value $evaluateExpression gave back',
} satisfies Partial<Record<BridgeMessage['type'], string>>;

interface CallSubject {
	text: string;
	nodeName?: string;
}

function callTypeOf(rawMsg: unknown): string | undefined {
	if (typeof rawMsg !== 'object' || rawMsg === null || !('type' in rawMsg)) return undefined;
	return typeof rawMsg.type === 'string' ? rawMsg.type : undefined;
}

/** Name what the caller asked for, so a call that returns no item does not read as an item read. */
function subjectForCall(rawMsg: unknown, data: WorkflowData): CallSubject {
	const type = callTypeOf(rawMsg);
	if (type !== undefined && !ITEM_CALL_TYPES.has(type)) {
		return { text: CALL_SUBJECTS[type] ?? 'the value the expression asked for' };
	}
	const nodeName = nodeNameForCall(rawMsg, data);
	const source = nodeName === undefined ? 'an upstream node' : `node '${nodeName}'`;
	return { text: `item from ${source}`, nodeName };
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

/**
 * Build the error for a value the engine refuses, naming the node and the key path of the
 * member it refused. Asks the engine itself through `transferProbe`, within `budgetMs`.
 */
export function untransferableItemError(
	value: unknown,
	transferProbe: TransferProbe,
	rawMsg: unknown,
	data: WorkflowData,
	budgetMs: number,
): ExpressionError {
	let subject: CallSubject = { text: 'item from an upstream node' };
	try {
		subject = subjectForCall(rawMsg, data);
	} catch {}
	try {
		const state: WalkState = {
			probe: transferProbe,
			seen: new Set<object>(),
			deadline: Date.now() + budgetMs,
			exhausted: false,
		};
		const found = walk(value, '', 0, state);
		return buildError(subject, found, state.exhausted);
	} catch {
		return buildError(subject, undefined, false);
	}
}

interface SanitiseState {
	probe: TransferProbe;
	deadline: number;
	subject: CallSubject;
}

function marker(state: SanitiseState, path: string, descriptor: string | undefined): object {
	return {
		[TRANSFER_UNUSABLE_KEY]: true,
		message: refusalMessage(state.subject, { path, descriptor }, false),
	};
}

function sanitiseMembers(
	state: SanitiseState,
	value: object,
	path: string,
	depth: number,
): unknown {
	const members = ownMembers(value, path);
	if (members === undefined) return marker(state, path, describe(value));

	// An array rebuilds by index, which keeps the length and the holes; a structured clone
	// drops the non-index keys of an array too.
	const indexed = Array.isArray(value) ? new Array<unknown>(value.length) : undefined;
	const copy: Record<string, unknown> = {};
	for (const member of members) {
		const sanitised = !('value' in member.descriptor)
			? marker(state, member.path, 'a getter')
			: sanitiseValue(state, member.descriptor.value, member.path, depth + 1);
		if (indexed === undefined) copy[member.key] = sanitised;
		else if (ARRAY_INDEX.test(member.key)) indexed[Number(member.key)] = sanitised;
	}
	return indexed ?? copy;
}

function sanitiseValue(state: SanitiseState, value: unknown, path: string, depth: number): unknown {
	if (alwaysTransferable(value)) return value;
	if (Date.now() > state.deadline) return marker(state, path, 'the search for it stopped early');
	try {
		if (state.probe(value)) return value;
	} catch {}
	if (value === null || typeof value !== 'object') return marker(state, path, describe(value));
	if (depth >= TRANSFER_MAX_DEPTH) return marker(state, path, 'the search for it stopped early');
	// A proxy rebuilds from its keys; anything else with a kind of its own (a Map, a promise)
	// would rebuild into the wrong thing, so it stays refused.
	const kind = describe(value);
	if (kind !== undefined && !types.isProxy(value)) return marker(state, path, kind);
	return sanitiseMembers(state, value, path, depth);
}

/**
 * Rebuild `value` with every member the engine refuses replaced by a marker the runtime
 * turns into a throwing read, so a sibling key still crosses. Returns undefined when the
 * rebuilt value is itself refused.
 */
export function sanitiseForTransfer(
	value: unknown,
	transferProbe: TransferProbe,
	rawMsg: unknown,
	data: WorkflowData,
	budgetMs: number,
): object | undefined {
	let subject: CallSubject = { text: 'item from an upstream node' };
	try {
		subject = subjectForCall(rawMsg, data);
	} catch {}
	try {
		const state: SanitiseState = {
			probe: transferProbe,
			deadline: Date.now() + budgetMs,
			subject,
		};
		const sanitised = sanitiseValue(state, value, '', 0);
		const envelope = { [TRANSFER_SANITISED_KEY]: true, value: sanitised };
		return transferProbe(envelope) ? envelope : undefined;
	} catch {
		return undefined;
	}
}
