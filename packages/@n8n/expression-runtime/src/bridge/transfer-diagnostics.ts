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

const MAX_DIAGNOSTIC_MS = 250;

interface TransferRejection {
	path: string;
	descriptor?: string;
}

interface Member {
	path: string;
	key: string;
	descriptor: PropertyDescriptor;
}

const ARRAY_INDEX = /^(?:0|[1-9]\d*)$/;
const IDENTIFIER_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function diagnosticBudgetMs(msLeft: number): number {
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

interface SanitiseState {
	probe: TransferProbe;
	deadline: number;
	subject: CallSubject;
	seen: Set<object>;
	first?: TransferRejection;
	stopped: boolean;
}

/** Replace a refused member by a marker, keeping the first refusal for the error message. */
function refuse(state: SanitiseState, path: string, descriptor: string | undefined): object {
	state.first ??= { path, descriptor };
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
	if (members === undefined) return refuse(state, path, describe(value));

	// An array rebuilds by index, which keeps the length and the holes; a structured clone
	// drops the non-index keys of an array too.
	const indexed = Array.isArray(value) ? new Array<unknown>(value.length) : undefined;
	const copy: Record<string, unknown> = {};
	for (const member of members) {
		const sanitised = !('value' in member.descriptor)
			? refuse(state, member.path, 'a getter')
			: sanitiseValue(state, member.descriptor.value, member.path, depth + 1);
		if (indexed === undefined) copy[member.key] = sanitised;
		else if (ARRAY_INDEX.test(member.key)) indexed[Number(member.key)] = sanitised;
	}
	return indexed ?? copy;
}

function stopEarly(state: SanitiseState, path: string): object {
	state.stopped = true;
	return refuse(state, path, 'the search for it stopped early');
}

function sanitiseValue(state: SanitiseState, value: unknown, path: string, depth: number): unknown {
	if (alwaysTransferable(value)) return value;
	if (Date.now() > state.deadline) return stopEarly(state, path);
	// Every object in `seen` is an ancestor the engine already refused, so a member that
	// points back at one is refused too, and naming the cycle beats rebuilding it to the cap.
	if (typeof value === 'object' && value !== null && state.seen.has(value)) {
		return refuse(state, path, 'a circular reference');
	}
	try {
		if (state.probe(value)) return value;
	} catch {}
	if (value === null || typeof value !== 'object') return refuse(state, path, describe(value));
	if (depth >= TRANSFER_MAX_DEPTH) return stopEarly(state, path);
	// A proxy rebuilds from its keys; anything else with a kind of its own (a Map, a promise)
	// would rebuild into the wrong thing, so it stays refused.
	const kind = describe(value);
	if (kind !== undefined && !types.isProxy(value)) return refuse(state, path, kind);
	state.seen.add(value);
	return sanitiseMembers(state, value, path, depth);
}

export type TransferOutcome = { envelope: object } | { error: ExpressionError };

/**
 * Take `value` across with every member the engine refuses replaced by a marker the runtime
 * turns into a throwing read, so a sibling key still crosses. Returns the error instead when
 * the rebuilt value is itself refused. The rebuild stops at `msLeft`, so diagnosing a refusal
 * cannot turn an expression into a timeout.
 */
export function transferOrExplain(
	value: unknown,
	transferProbe: TransferProbe,
	rawMsg: unknown,
	data: WorkflowData,
	msLeft: number,
): TransferOutcome {
	let subject: CallSubject = { text: 'item from an upstream node' };
	try {
		subject = subjectForCall(rawMsg, data);
	} catch {}
	const state: SanitiseState = {
		probe: transferProbe,
		deadline: Date.now() + diagnosticBudgetMs(msLeft),
		subject,
		seen: new Set<object>(),
		stopped: false,
	};
	try {
		const envelope = { [TRANSFER_SANITISED_KEY]: true, value: sanitiseValue(state, value, '', 0) };
		if (transferProbe(envelope)) return { envelope };
	} catch {}
	return { error: buildError(subject, state.first, state.stopped) };
}
