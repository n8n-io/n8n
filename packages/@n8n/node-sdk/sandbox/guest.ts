// The core of the generic JS guests of the sandbox. Each kind interface has one WASM component
// for every JS bundle of that kind: `action.ts` and `provider.ts`. The bundle runs in the same
// JS realm, so this code is not a trust boundary: the sidecar links only the granted imports,
// and the host checks every call and every output.
import { source } from 'n8n:js-guest/bundle@1.0.0';
import type * as wit from 'n8n:node-contract/capabilities@2.5.0';
import {
	request as witRequest,
	type HttpError as WitHttpError,
	type HttpFailure,
	type HttpRequest as WitHttpRequest,
} from 'n8n:node-contract/http@2.5.0';
import { log as witLog } from 'n8n:node-contract/log@2.5.0';
import { get as witCredential } from 'n8n:node-contract/run-credential@2.5.0';
import { safeRegex } from 'n8n-workflow';

import { isHttpError, type Action, type HttpRequest } from '../src/define';
import type { JsonSchema } from '../src/schema';
import type { ChatMessage, ChatReply, ChatRequest, ToolCall } from '../src/subnodes';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isAction = (value: unknown): value is Action =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	isRecord(value.flow) &&
	(typeof value.run === 'function' || isRecord(value.request) || isRecord(value.list));

// The engine has no network and no timers. A clear error is better than a trap.
const unavailable = (name: string, instead: string) => () => {
	throw new Error(`${name} is not available in the sandbox. ${instead}`);
};
Reflect.set(globalThis, 'fetch', unavailable('fetch', 'Use http.request.'));
Reflect.set(globalThis, 'setTimeout', unavailable('setTimeout', 'An action has no timers.'));
Reflect.set(globalThis, 'setInterval', unavailable('setInterval', 'An action has no timers.'));

// StarlingMonkey has no `URL.canParse` (ES2024 web API), which the SDK and bundles use.
if (typeof URL.canParse !== 'function') {
	Reflect.set(URL, 'canParse', (url: string, base?: string) => {
		try {
			return new URL(url, base) instanceof URL;
		} catch {
			return false;
		}
	});
}

/** Host modules a bundle may import, as in the host process. */
const HOST_MODULES: Readonly<Record<string, unknown>> = { 'n8n-workflow': { safeRegex } };

/** The bundle loads at the first call, not at build time: its source is an import. */
const loaded = new Map<'action', Action>();
export function actionOf(): Action {
	const cached = loaded.get('action');
	if (cached) return cached;
	const module: { exports: unknown } = { exports: {} };
	const hostRequire = (id: string) => {
		if (!(id in HOST_MODULES)) throw new Error(`A frozen action cannot import ${id}`);
		return HOST_MODULES[id];
	};
	// The engine has no `node:vm`. The bundle runs in this realm either way.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
	const evaluate = new Function('module', 'require', source());
	Reflect.apply(evaluate, undefined, [module, hostRequire]);
	const exported = isRecord(module.exports) ? module.exports.default : undefined;
	if (!isAction(exported)) throw new Error('The bundle does not export an action');
	loaded.set('action', exported);
	return exported;
}

/** `describe` of a kind interface: the contract of the bundle as JSON. */
export const describe = () =>
	JSON.stringify(actionOf(), (_key, value: unknown) =>
		typeof value === 'function' ? undefined : value,
	);

export const parsed = (text: string): unknown => JSON.parse(text);

export function inputOf(text: string): Record<string, unknown> {
	const input = parsed(text);
	if (!isRecord(input)) throw new Error('The run input is not an object');
	return input;
}

export const recordOf = (text: string): Record<string, unknown> => {
	const value = parsed(text);
	if (!isRecord(value)) throw new Error('The host gave a value that is not an object');
	return value;
};

const isJsonSchema = (value: unknown): value is JsonSchema => isRecord(value);

export const schemaOf = (text: string): JsonSchema => {
	const value = parsed(text);
	if (!isJsonSchema(value)) throw new Error('The host gave a JSON Schema that is not an object');
	return value;
};

const queryText = (value: unknown) =>
	typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

const entriesOf = (record: Readonly<Record<string, unknown>> | undefined) =>
	Object.entries(record ?? {}).flatMap(
		([key, value]): Array<[string, string]> =>
			value === undefined
				? []
				: Array.isArray(value)
					? value.map((entry): [string, string] => [key, queryText(entry)])
					: [[key, queryText(value)]],
	);

/** The WIT form of a request without its body; it is also a `binary-request`. */
export const witRequestOf = (request: HttpRequest): Omit<WitHttpRequest, 'body'> => ({
	method: request.method ?? 'GET',
	target:
		request.url !== undefined
			? { tag: 'url', val: request.url }
			: { tag: 'path', val: request.path },
	query: entriesOf(request.query),
	headers: Object.entries(request.headers ?? {}),
	...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
	...(request.retry === undefined ? {} : { retry: request.retry }),
});

const payloadOf = (error: unknown): unknown =>
	isRecord(error) || error instanceof Error ? Reflect.get(error, 'payload') : undefined;

const isFailure = (value: unknown): value is HttpFailure =>
	isRecord(value) && (value.tag === 'transport' || value.tag === 'response');

const isWitHttpError = (value: unknown): value is WitHttpError =>
	isRecord(value) &&
	typeof value.message === 'string' &&
	typeof value.status === 'number' &&
	Array.isArray(value.headers) &&
	typeof value.body === 'string';

/** The error that `http.request` throws in the host, from an `http-error`. */
const responseErrorOf = ({ message, status, headers, body }: WitHttpError) =>
	Object.assign(new Error(message), {
		status,
		headers: Object.fromEntries(headers),
		body: parsed(body),
	});

/** Runs an `http` or `binary` request: a failure throws the error of `http.request`. */
export function httpCall<T>(run: () => T): T {
	try {
		return run();
	} catch (error) {
		const failure = payloadOf(error);
		if (!isFailure(failure)) throw error;
		throw failure.tag === 'transport' ? new Error(failure.val) : responseErrorOf(failure.val);
	}
}

/** The value of `http.request`: the body, or the full response. */
export const responseOf = (
	response: { readonly status: number; readonly headers: Array<[string, string]> },
	body: unknown,
	full: boolean | undefined,
) =>
	full
		? { body, headers: Object.fromEntries(response.headers), statusCode: response.status }
		: body;

/** A request with a JSON body and a JSON response. */
export function jsonRequest(request: HttpRequest): unknown {
	const response = httpCall(() =>
		witRequest({
			...witRequestOf(request),
			...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
		}),
	);
	return responseOf(response, parsed(response.body), request.fullResponse);
}

export const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string) =>
	witLog(level, String(message));

/** A WIT `result` error throws its payload, a text or a run error. The bundle sees an `Error`. */
export function call<T>(run: () => T): T {
	try {
		return run();
	} catch (error) {
		const payload = payloadOf(error);
		if (typeof payload === 'string') throw new Error(payload);
		if (!isRecord(payload) || typeof payload.message !== 'string') throw error;
		const { response } = payload;
		throw isWitHttpError(response) ? responseErrorOf(response) : new Error(payload.message);
	}
}

const credentials = new Map<'credential', unknown>();

/** One component instance runs one node execution, so it reads the credential once. */
function credentialOf(): unknown {
	if (credentials.has('credential')) return credentials.get('credential');
	const credential = call(() => witCredential());
	const value =
		credential === undefined
			? undefined
			: Object.freeze({
					type: credential.type,
					fields: Object.freeze(recordOf(credential.fields)),
				});
	credentials.set('credential', value);
	return value;
}

/** `context` with the credential of the run: a getter, so a read can fail only when `run()` reads it. */
export const withCredential = <T extends object>(context: T) => ({
	...context,
	get credential(): unknown {
		return credentialOf();
	},
});

/** The run error of a kind interface: the message, and the response of a failed request. */
export function runErrorOf(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	if (!isHttpError(error)) return { message };
	return {
		message,
		response: {
			message,
			status: error.status,
			headers: Object.entries(error.headers),
			body: JSON.stringify(error.body ?? null),
		},
	};
}

/** The error of a WIT `result` export: ComponentizeJS sends its own `payload`. */
export class ResultError extends Error {
	constructor(readonly payload: unknown) {
		super('The run failed');
	}
}

// ── The chat types of `capabilities` in their ComponentizeJS form ───────────────────────

const witToolCallOf = ({ id, name, args }: ToolCall): wit.ToolCall => ({
	id,
	name,
	args: JSON.stringify(args),
});

const toolCallOf = ({ id, name, args }: wit.ToolCall): ToolCall => ({
	id,
	name,
	args: recordOf(args),
});

export function witMessageOf(message: ChatMessage): wit.ChatMessage {
	switch (message.role) {
		case 'system':
		case 'user':
			return { tag: message.role, val: message.content };
		case 'assistant':
			return {
				tag: 'assistant',
				val: {
					content: message.content,
					...(message.toolCalls ? { toolCalls: message.toolCalls.map(witToolCallOf) } : {}),
				},
			};
		case 'tool':
			return {
				tag: 'tool',
				val: { toolCallId: message.toolCallId, name: message.name, content: message.content },
			};
	}
}

export function messageOf(message: wit.ChatMessage): ChatMessage {
	switch (message.tag) {
		case 'system':
		case 'user':
			return { role: message.tag, content: message.val };
		case 'assistant':
			return {
				role: 'assistant',
				content: message.val.content,
				...(message.val.toolCalls ? { toolCalls: message.val.toolCalls.map(toolCallOf) } : {}),
			};
		case 'tool':
			return { role: 'tool', ...message.val };
	}
}

export const witChatRequestOf = ({ messages, tools, output }: ChatRequest): wit.ChatRequest => ({
	messages: messages.map(witMessageOf),
	...(tools
		? {
				tools: tools.map(({ name, description, input }) => ({
					name,
					description,
					input: JSON.stringify(input),
				})),
			}
		: {}),
	...(output ? { output: JSON.stringify(output) } : {}),
});

export const chatRequestOf = ({ messages, tools, output }: wit.ChatRequest): ChatRequest => ({
	messages: messages.map(messageOf),
	...(tools
		? {
				tools: tools.map(({ name, description, input }) => ({
					name,
					description,
					input: schemaOf(input),
				})),
			}
		: {}),
	...(output === undefined ? {} : { output: schemaOf(output) }),
});

export const witReplyOf = ({ text, toolCalls, finishReason, usage }: ChatReply): wit.ChatReply => ({
	text,
	toolCalls: toolCalls.map(witToolCallOf),
	finishReason,
	...(usage ? { usage } : {}),
});

export const replyOf = ({ text, toolCalls, finishReason, usage }: wit.ChatReply): ChatReply => ({
	text,
	toolCalls: toolCalls.map(toolCallOf),
	finishReason,
	...(usage ? { usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } } : {}),
});
