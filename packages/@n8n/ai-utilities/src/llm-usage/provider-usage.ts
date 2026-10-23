import { isRecord } from '@n8n/utils/is-record';
import { StringDecoder } from 'node:string_decoder';

/** Usage read from a raw provider response. */
export interface ParsedUsage {
	provider: string;
	model?: string;
	providerResponseId?: string;
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
}

/** The longest JSON body or SSE line that is kept, in characters. */
const MAX_BUFFERED_CHARS = 1_000_000;
/** Reads a whole body in slices, so the reader stops at `MAX_BUFFERED_CHARS` before it decodes the rest. */
const READ_SLICE_SIZE = 64 * 1024;
/** The start of an SSE stream: a field name and a colon, or a comment line. */
const SSE_START = /^(data|event|id|retry)?:/;

const countOrZero = (value: unknown) => (typeof value === 'number' ? value : 0);
const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const objectAt = (value: unknown) => (isRecord(value) ? value : {});

/** Reads one JSON response of OpenAI (Chat or Responses), Anthropic or Gemini. */
function fromObject(body: Record<string, unknown>): ParsedUsage | undefined {
	const usage = isRecord(body.usage) ? body.usage : undefined;
	const ids = { model: asString(body.model), providerResponseId: asString(body.id) };

	if (body.type === 'message' && usage) {
		const cacheRead = countOrZero(usage.cache_read_input_tokens);
		const cacheWrite = countOrZero(usage.cache_creation_input_tokens);
		return {
			provider: 'anthropic',
			...ids,
			inputTokens: countOrZero(usage.input_tokens) + cacheRead + cacheWrite,
			outputTokens: countOrZero(usage.output_tokens),
			cacheReadTokens: cacheRead,
			cacheWriteTokens: cacheWrite,
		};
	}
	// OpenAI Chat, also the shape of most OpenAI-compatible providers.
	if (usage && typeof usage.prompt_tokens === 'number') {
		return {
			provider: 'openai',
			...ids,
			inputTokens: usage.prompt_tokens,
			outputTokens: countOrZero(usage.completion_tokens),
			cacheReadTokens: countOrZero(objectAt(usage.prompt_tokens_details).cached_tokens),
			cacheWriteTokens: 0,
		};
	}
	if (body.object === 'response' && usage && typeof usage.input_tokens === 'number') {
		return {
			provider: 'openai',
			...ids,
			inputTokens: usage.input_tokens,
			outputTokens: countOrZero(usage.output_tokens),
			cacheReadTokens: countOrZero(objectAt(usage.input_tokens_details).cached_tokens),
			cacheWriteTokens: 0,
		};
	}
	if (isRecord(body.usageMetadata)) {
		const metadata = body.usageMetadata;
		return {
			provider: 'google',
			model: asString(body.modelVersion),
			providerResponseId: asString(body.responseId),
			inputTokens: countOrZero(metadata.promptTokenCount),
			outputTokens:
				countOrZero(metadata.candidatesTokenCount) + countOrZero(metadata.thoughtsTokenCount),
			cacheReadTokens: countOrZero(metadata.cachedContentTokenCount),
			cacheWriteTokens: 0,
		};
	}
	return undefined;
}

/** The last element with usage, for example a Gemini stream returned as a JSON array. */
const fromArray = (items: unknown[]) =>
	items.reduce<ParsedUsage | undefined>(
		(found, item) => (isRecord(item) ? (fromObject(item) ?? found) : found),
		undefined,
	);

const numbersOf = (value: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry === 'number'));

/** Keeps the usage state of an SSE stream, one event at a time. */
function createSseState() {
	let usage: ParsedUsage | undefined;
	let anthropicMessage: Record<string, unknown> | undefined;
	return {
		add(event: Record<string, unknown>) {
			// Anthropic sends the message with its usage first, then running totals. A total can
			// also raise the input and cache counts, for example after a server tool.
			if (event.type === 'message_start' && isRecord(event.message)) {
				anthropicMessage = { ...event.message, type: 'message' };
				usage = fromObject(anthropicMessage);
			} else if (event.type === 'message_delta' && anthropicMessage && isRecord(event.usage)) {
				const totals = { ...objectAt(anthropicMessage.usage), ...numbersOf(event.usage) };
				anthropicMessage = { ...anthropicMessage, usage: totals };
				usage = fromObject(anthropicMessage) ?? usage;
			} else {
				// OpenAI Responses ends with `response.completed`, `.incomplete` or `.failed`, and
				// each carries the usage that is billed.
				const isResponseEvent =
					typeof event.type === 'string' && event.type.startsWith('response.');
				const body = isResponseEvent && isRecord(event.response) ? event.response : event;
				usage = fromObject(body) ?? usage;
			}
		},
		result: () => usage,
	};
}

/**
 * Reads a response body chunk by chunk. It keeps only the usage state, never the body:
 * SSE is parsed line by line, and a JSON body is collected up to `MAX_BUFFERED_CHARS` characters.
 */
export function createUsageReader() {
	const decoder = new StringDecoder('utf8');
	const sse = createSseState();
	// `other`: neither JSON nor SSE, such as audio or an image. It carries no usage.
	let mode: 'json' | 'sse' | 'other' | undefined;
	let pending = '';
	let tooLarge = false;
	// Set while the rest of an SSE line that was too long is still arriving.
	let skippingLine = false;

	const readLine = (line: string) => {
		const trimmed = line.trim();
		if (!trimmed.startsWith('data:')) return;
		const data = trimmed.slice(5).trim();
		if (!data || data === '[DONE]') return;
		try {
			const event: unknown = JSON.parse(data);
			if (isRecord(event)) sse.add(event);
		} catch {
			// A line that is not JSON carries no usage.
		}
	};

	const readCompleteLines = () => {
		let end = pending.indexOf('\n');
		while (end >= 0) {
			if (skippingLine) skippingLine = false;
			else readLine(pending.slice(0, end));
			pending = pending.slice(end + 1);
			end = pending.indexOf('\n');
		}
	};

	const detectMode = () => {
		const head = pending.trimStart();
		if (head.startsWith('{') || head.startsWith('[')) mode = 'json';
		else if (SSE_START.test(head)) mode = 'sse';
		// A field name is at most 5 characters, so a longer start without a colon is not SSE.
		else if (head.length > 6 || head.includes('\n')) mode = 'other';
	};

	/** True when the rest of the body cannot change the result. */
	const isDone = () => tooLarge || mode === 'other';

	return {
		isDone,
		push(chunk: Buffer | string) {
			if (isDone()) return;
			pending += typeof chunk === 'string' ? chunk : decoder.write(chunk);
			if (!mode) detectMode();
			if (mode === 'other') {
				pending = '';
				return;
			}
			if (mode === 'sse') {
				readCompleteLines();
				// One line over the limit, such as a base64 image, is dropped. The events after
				// it, which carry the usage, are still read.
				if (pending.length > MAX_BUFFERED_CHARS) {
					skippingLine = true;
					pending = '';
				}
				return;
			}
			if (pending.length > MAX_BUFFERED_CHARS) {
				tooLarge = true;
				pending = '';
			}
		},
		result(): ParsedUsage | undefined {
			pending += decoder.end();
			if (mode === 'sse') {
				if (!skippingLine) readLine(pending);
				return sse.result();
			}
			if (mode !== 'json' || tooLarge) return undefined;
			try {
				const body: unknown = JSON.parse(pending);
				if (Array.isArray(body)) return fromArray(body);
				return isRecord(body) ? fromObject(body) : undefined;
			} catch {
				return undefined;
			}
		},
	};
}

/** Reads usage from a whole response body: a parsed object, a JSON or SSE string, or a Buffer. */
export function parseProviderUsage(body: unknown): ParsedUsage | undefined {
	if (typeof body === 'string' || Buffer.isBuffer(body)) {
		const reader = createUsageReader();
		for (let start = 0; start < body.length && !reader.isDone(); start += READ_SLICE_SIZE) {
			const end = start + READ_SLICE_SIZE;
			reader.push(typeof body === 'string' ? body.slice(start, end) : body.subarray(start, end));
		}
		return reader.result();
	}
	if (Array.isArray(body)) return fromArray(body);
	return isRecord(body) ? fromObject(body) : undefined;
}
