// The JS guests of the sandbox in Node. `runGuest` answers the host as the sidecar does
// (`spec/json-rpc.md`): `[initialize]`, the exports of the kind, `[take]` and `[drop]`.
import { createHash } from 'node:crypto';
import { readFileSync, readSync, writeSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import type * as wit from 'n8n:node-contract/capabilities@2.9.0';

import { action } from '../action';
import { capabilities, provider } from '../provider';
import {
	camel,
	connect,
	messageIn,
	messageOut,
	setSource,
	stoppedMessage,
	toolCallOut,
} from './imports';

/** One line in each direction. `receive` blocks, so a WIT import can wait for its answer. */
export interface SyncTransport {
	/** The next line from the host, or `undefined` at the end. */
	receive(): string | undefined;
	send(line: string): void;
}

/** The command line of the sidecar that the guest needs, and the kind instead of the world. */
export interface GuestArgs {
	readonly kind: 'action' | 'provider';
	readonly bundle?: string;
	readonly bundleSha256?: string;
	readonly grants: readonly string[];
	readonly nodeContract: string;
}

const NODE_CONTRACT = '2.9.0';

/** The imports of each world, by WIT interface name. */
const BASE_IMPORTS = ['http', 'log', 'limits', 'run-credential', 'schema'];
const WORLD_IMPORTS: Readonly<Record<GuestArgs['kind'], ReadonlySet<string>>> = {
	action: new Set([
		...BASE_IMPORTS,
		...['binary', 'data-tables', 'parsers', 'code', 'wait', 'input-of', 'supplied'],
		...['capabilities', 'chunk'],
	]),
	provider: new Set(BASE_IMPORTS),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** `--name value` pairs, as the sidecar reads them. `--grant` repeats. */
export function guestArgsOf(argv: readonly string[]): GuestArgs {
	const pairs = argv.flatMap((flag, index) =>
		index % 2 === 0 && flag.startsWith('--') ? [[flag.slice(2), argv[index + 1] ?? '']] : [],
	);
	const one = (name: string) => pairs.filter(([key]) => key === name).pop()?.[1];
	return {
		kind: one('kind') === 'provider' ? 'provider' : 'action',
		bundle: one('bundle'),
		bundleSha256: one('bundle-sha256'),
		grants: pairs.filter(([key]) => key === 'grant').map(([, value = '']) => value),
		nodeContract: one('node-contract') ?? NODE_CONTRACT,
	};
}

// A sleep that blocks the thread: the guest waits for the host and runs nothing else.
const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function retried<T>(io: () => T): T {
	for (;;) {
		try {
			return io();
		} catch (error) {
			if (!isRecord(error) || error.code !== 'EAGAIN') throw error;
			pause(1);
		}
	}
}

/** Newline-delimited JSON on blocking reads of `input` and writes to `output`. */
export function stdioTransport(input = 0, output = 1): SyncTransport {
	const decoder = new StringDecoder('utf8');
	const chunk = Buffer.alloc(1 << 20);
	const lines: string[] = [];
	const partial: string[] = [];
	const state = { ended: false };
	return {
		receive() {
			while (lines.length === 0 && !state.ended) {
				const read = retried(() => readSync(input, chunk, 0, chunk.length, null));
				state.ended = read === 0;
				const [head = '', ...rest] = decoder.write(chunk.subarray(0, read)).split('\n');
				const tail = rest.pop();
				if (tail === undefined) {
					partial.push(head);
					continue;
				}
				lines.push(...[[...partial, head].join(''), ...rest].filter(Boolean));
				partial.splice(0, partial.length, tail);
			}
			return lines.shift();
		},
		send(line) {
			const bytes = Buffer.from(`${line}\n`);
			for (let offset = 0; offset < bytes.length; ) {
				offset += retried(() => writeSync(output, bytes, offset));
			}
		},
	};
}

class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string,
		readonly data?: unknown,
	) {
		super(message);
	}
}

/** A JSON value that crosses as text in WIT and inline in JSON-RPC. */
const inline = (json: string): unknown => JSON.parse(json);
const texts = (value: unknown) =>
	Array.isArray(value) ? value.map((entry) => JSON.stringify(entry ?? null)) : [];

/** The `run-error` of a `ResultError` in its JSON-RPC form: the response body inline. */
const runErrorOf = (error: unknown): unknown =>
	runErrorJson(error instanceof Error && 'payload' in error ? error.payload : undefined);

function runErrorJson(payload: unknown): unknown {
	const response = isRecord(payload) ? payload.response : undefined;
	if (!isRecord(payload) || !isRecord(response) || typeof response.body !== 'string') {
		return payload;
	}
	return { ...payload, response: { ...response, body: inline(response.body) } };
}

/** An export with a WIT `result`: a `ResultError` becomes −32000 with its run error. */
async function result<T>(run: () => T | Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		const data = runErrorOf(error);
		if (!isRecord(data)) throw error;
		throw new RpcError(-32000, String(data.message), data);
	}
}

const outputOf = (output: { tag: string; val: unknown }) => {
	if (output.tag === 'item' && typeof output.val === 'string') {
		return { tag: 'item', val: inline(output.val) };
	}
	if (output.tag === 'made' && Array.isArray(output.val) && typeof output.val[0] === 'string') {
		return { tag: 'made', val: [inline(output.val[0]), output.val[1]] };
	}
	return output;
};

interface Routed {
	to?: string;
	output: { tag: string; val: unknown };
}

const routedJson = ({ to, output }: Routed) => ({
	...(to === undefined ? {} : { to }),
	output: outputOf(output),
});

const outcomeJson = (outcome: { tag: 'output'; val: Routed } | { tag: 'failed'; val: unknown }) =>
	outcome.tag === 'output'
		? { tag: 'output', val: routedJson(outcome.val) }
		: { tag: 'failed', val: runErrorJson(outcome.val) };

/** `next` until the end, an error, or `max` outputs, in one answer. */
async function take<T>(
	run: { next(): Promise<T | undefined> },
	max: unknown,
	json: (value: T) => unknown,
) {
	const outputs: unknown[] = [];
	while (outputs.length < Math.max(typeof max === 'number' ? max : 1, 1)) {
		const next = await run.next().then(
			(value) => ({ value }),
			(error: unknown) => ({ error }),
		);
		// A stopped guest answers as the sidecar after a trap.
		const stopped = stoppedMessage();
		if (stopped !== undefined) throw new RpcError(-32000, stopped);
		if ('error' in next) {
			const error = runErrorOf(next.error);
			if (error === undefined) throw next.error;
			return { outputs, done: true, error };
		}
		if (next.value === undefined) return { outputs, done: true };
		outputs.push(json(next.value));
	}
	return { outputs, done: false };
}

// The guest trusts the host for the shape of its values, as the ComponentizeJS bindings do.
const isChatRequest = (value: unknown): value is wit.ChatRequest =>
	isRecord(value) && Array.isArray(value.messages);
const isChatMessages = (value: unknown): value is wit.ChatMessage[] => Array.isArray(value);
const isTexts = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === 'string');

function chatRequestOf(value: unknown): wit.ChatRequest {
	const { messages, tools, output } = isRecord(value) ? value : {};
	const request = {
		messages: Array.isArray(messages) ? messages.map(messageIn) : [],
		...(Array.isArray(tools)
			? {
					tools: tools.map((tool: unknown) => ({
						...(isRecord(tool) ? tool : {}),
						input: JSON.stringify(isRecord(tool) ? tool.input : null),
					})),
				}
			: {}),
		...(output === undefined ? {} : { output: JSON.stringify(output) }),
	};
	if (!isChatRequest(request)) throw new RpcError(-32602, 'chat needs a chat-request');
	return request;
}

const replyOf = ({ toolCalls, ...reply }: wit.ChatReply) => ({
	...reply,
	toolCalls: toolCalls.map(toolCallOut),
});

export async function runGuest(transport: SyncTransport, args: GuestArgs): Promise<void> {
	const handles = new Map<number, object>();
	const counter = { next: 1 };
	connect(transport, args.grants);

	const initialize = (params: Record<string, unknown>) => {
		const major = (version: unknown) => String(version).split('.')[0];
		if (major(params.nodeContract) !== major(NODE_CONTRACT)) {
			throw new RpcError(
				-32000,
				`The host implements Node Contract ${String(params.nodeContract)}, the guest ${NODE_CONTRACT}`,
			);
		}
		const unknown = args.grants.filter((grant) => !WORLD_IMPORTS[args.kind].has(grant));
		if (unknown.length > 0) {
			throw new RpcError(
				-32000,
				`${unknown.join(', ')} is not an import of the ${args.kind} world`,
			);
		}
		const code = args.bundle === undefined ? '' : readFileSync(args.bundle, 'utf8');
		const digest = createHash('sha256').update(code).digest('hex');
		if (args.bundle !== undefined && digest !== args.bundleSha256) {
			throw new RpcError(-32000, 'The bundle file does not match --bundle-sha256');
		}
		setSource(code);
		return { nodeContract: args.nodeContract, kind: args.kind };
	};

	/** The guest numbers the resources that it creates. */
	const created = (resource: object) => {
		const handle = counter.next++;
		handles.set(handle, resource);
		return handle;
	};

	const own = <T>(type: new (...params: never[]) => T, self: unknown): T => {
		const resource = typeof self === 'number' ? handles.get(self) : undefined;
		if (!(resource instanceof type)) throw new RpcError(-32602, `no handle ${String(self)}`);
		return resource;
	};

	const dispatch = async (method: string, params: Record<string, unknown>): Promise<unknown> => {
		if (method === '[initialize]') return initialize(params);
		const stopped = stoppedMessage();
		if (stopped !== undefined) throw new RpcError(-32000, stopped);
		const { self } = params;
		switch (method) {
			case 'action.describe':
				return inline(action.describe());
			case 'provider.describe':
				return inline(provider.describe());
			case 'action.migrate': {
				const fromMajor = Number(params.fromMajor);
				const given = JSON.stringify(params.params ?? null);
				return inline(await result(() => action.migrate(fromMajor, given)));
			}
			case 'action.item-run.[new]':
				return created(new action.ItemRun(JSON.stringify(params.input), texts(params.items)));
			case 'action.item-run.[take]':
				return await take(own(action.ItemRun, self), params.max, routedJson);
			case 'action.join-run.[new]': {
				const inputs = Array.isArray(params.inputs) ? params.inputs.map(texts) : [];
				return created(new action.JoinRun(JSON.stringify(params.input), inputs));
			}
			case 'action.join-run.[take]':
				return await take(own(action.JoinRun, self), params.max, routedJson);
			case 'action.chunk-run.[new]': {
				const inputs = texts(params.inputs);
				const continueOnFail = params.continueOnFail === true;
				return created(new action.ChunkRun(inputs, texts(params.items), continueOnFail));
			}
			case 'action.chunk-run.[take]':
				return await take(own(action.ChunkRun, self), params.max, outcomeJson);
			case 'provider.supply': {
				const { tag, val } = await result(
					async () => await provider.supply(JSON.stringify(params.input)),
				);
				return { tag: camel(tag), val: created(val) };
			}
			case 'capabilities.chat-model.model':
				return own(capabilities.ChatModel, self).model();
			case 'capabilities.chat-model.chat': {
				const model = own(capabilities.ChatModel, self);
				const request = chatRequestOf(params.request);
				return replyOf(await result(async () => await model.chat(request)));
			}
			case 'capabilities.memory.load': {
				const memory = own(capabilities.Memory, self);
				return (await result(async () => await memory.load())).map(messageOut);
			}
			case 'capabilities.memory.save': {
				const memory = own(capabilities.Memory, self);
				const messages = Array.isArray(params.messages) ? params.messages.map(messageIn) : [];
				if (!isChatMessages(messages)) throw new RpcError(-32602, 'save needs chat messages');
				await result(async () => await memory.save(messages));
				return null;
			}
			case 'capabilities.tool.name':
				return own(capabilities.Tool, self).name();
			case 'capabilities.tool.description':
				return own(capabilities.Tool, self).description();
			case 'capabilities.tool.input':
				return inline(own(capabilities.Tool, self).input());
			case 'capabilities.tool.call': {
				const tool = own(capabilities.Tool, self);
				return inline(await result(async () => await tool.call(JSON.stringify(params.args))));
			}
			case 'capabilities.embeddings.embed': {
				const embeddings = own(capabilities.Embeddings, self);
				const { texts: input } = params;
				if (!isTexts(input)) throw new RpcError(-32602, 'embed needs texts');
				const vectors = await result(async () => await embeddings.embed(input));
				return vectors.map((vector) => Array.from(vector));
			}
			default:
				if (method.endsWith('.[drop]')) {
					handles.delete(Number(self));
					return null;
				}
				throw new RpcError(-32601, `method not found: ${method}`);
		}
	};

	const send = (message: Record<string, unknown>) =>
		transport.send(JSON.stringify({ jsonrpc: '2.0', ...message }));

	for (let line = transport.receive(); line !== undefined; line = transport.receive()) {
		const message: unknown = JSON.parse(line);
		if (!isRecord(message) || typeof message.method !== 'string') continue;
		const { id, method } = message;
		const params = isRecord(message.params) ? message.params : {};
		const reply = await dispatch(method, params).then(
			(value) => ({ result: value ?? null }),
			(error: unknown) => {
				const rpc =
					error instanceof RpcError
						? error
						: new RpcError(-32000, error instanceof Error ? error.message : String(error));
				return { error: { code: rpc.code, message: rpc.message, data: rpc.data } };
			},
		);
		if (id !== undefined) send({ id, ...reply });
	}
}
