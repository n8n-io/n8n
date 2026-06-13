/**
 * DeepSeek's "thinking mode" (V3.2+ / V4) requires that any assistant message
 * containing `tool_calls` is re-sent to the API with its original
 * `reasoning_content` field intact. The OpenAI-compatible client used by
 * `ChatOpenAI` does not preserve or forward `reasoning_content`, so multi-turn
 * tool-calling requests fail with HTTP 400:
 *   "The reasoning_content in the thinking mode must be passed back to the API."
 *
 * This helper builds a `fetch` wrapper that:
 *  1. Captures `reasoning_content` returned alongside each `tool_call` (from
 *     non-streaming JSON responses and from `text/event-stream` chunks).
 *  2. Re-injects the captured `reasoning_content` into outgoing assistant
 *     messages whose `tool_calls` reference the same ids.
 *
 * The store is scoped to a single fetch wrapper (i.e. one chat-model instance),
 * so multiple parallel executions do not share state.
 *
 * Reference: https://api-docs.deepseek.com/guides/thinking_mode
 */

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ToolCallShape {
	id?: string;
}

interface AssistantMessageShape {
	role?: string;
	reasoning_content?: string;
	tool_calls?: ToolCallShape[];
}

export function createReasoningContentFetch(baseFetch: FetchFn = fetch): FetchFn {
	const reasoningByToolCallId = new Map<string, string>();

	return async function reasoningFetch(input, init) {
		let nextInit = init;

		if (init && typeof init.body === 'string' && reasoningByToolCallId.size > 0) {
			const rewritten = injectReasoningContent(init.body, reasoningByToolCallId);
			if (rewritten !== undefined) {
				nextInit = { ...init, body: rewritten };
			}
		}

		const response = await baseFetch(input, nextInit);

		if (!response.ok || !response.body) {
			return response;
		}

		const contentType = response.headers.get('content-type') ?? '';

		if (contentType.includes('application/json')) {
			try {
				const cloned = response.clone();
				const data = (await cloned.json()) as unknown;
				captureFromJson(data, reasoningByToolCallId);
			} catch {
				// Ignore: response may not be JSON or already consumed.
			}
			return response;
		}

		if (contentType.includes('text/event-stream')) {
			const [forCaller, forParser] = response.body.tee();
			void parseSseStream(forParser, reasoningByToolCallId);
			return new Response(forCaller, {
				headers: response.headers,
				status: response.status,
				statusText: response.statusText,
			});
		}

		return response;
	};
}

function injectReasoningContent(body: string, store: Map<string, string>): string | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return undefined;
	}
	if (!parsed || typeof parsed !== 'object') return undefined;
	const messages = (parsed as { messages?: unknown }).messages;
	if (!Array.isArray(messages)) return undefined;

	let modified = false;
	for (const msg of messages) {
		if (!msg || typeof msg !== 'object') continue;
		const m = msg as AssistantMessageShape & Record<string, unknown>;
		if (m.role !== 'assistant') continue;
		if (typeof m.reasoning_content === 'string' && m.reasoning_content.length > 0) continue;
		if (!Array.isArray(m.tool_calls) || m.tool_calls.length === 0) continue;

		for (const tc of m.tool_calls) {
			const id = tc?.id;
			if (id && store.has(id)) {
				m.reasoning_content = store.get(id);
				modified = true;
				break;
			}
		}
	}

	return modified ? JSON.stringify(parsed) : undefined;
}

function captureFromJson(data: unknown, store: Map<string, string>): void {
	if (!data || typeof data !== 'object') return;
	const choices = (data as { choices?: unknown }).choices;
	if (!Array.isArray(choices)) return;
	for (const choice of choices) {
		if (!choice || typeof choice !== 'object') continue;
		const message = (choice as { message?: AssistantMessageShape }).message;
		if (!message) continue;
		const reasoning = message.reasoning_content;
		if (typeof reasoning !== 'string' || reasoning.length === 0) continue;
		if (!Array.isArray(message.tool_calls)) continue;
		for (const tc of message.tool_calls) {
			if (tc?.id) store.set(tc.id, reasoning);
		}
	}
}

async function parseSseStream(
	stream: ReadableStream<Uint8Array>,
	store: Map<string, string>,
): Promise<void> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	const reasoningByChoice = new Map<number, string>();
	const toolCallIdsByChoice = new Map<number, Set<string>>();
	let buffer = '';

	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			let newlineIdx: number;
			while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
				const line = buffer.slice(0, newlineIdx).trim();
				buffer = buffer.slice(newlineIdx + 1);
				if (!line.startsWith('data:')) continue;
				const payload = line.slice(5).trim();
				if (!payload || payload === '[DONE]') continue;

				let event: unknown;
				try {
					event = JSON.parse(payload);
				} catch {
					continue;
				}
				const choices = (event as { choices?: unknown })?.choices;
				if (!Array.isArray(choices)) continue;

				for (const choice of choices) {
					if (!choice || typeof choice !== 'object') continue;
					const idxRaw = (choice as { index?: unknown }).index;
					const idx = typeof idxRaw === 'number' ? idxRaw : 0;
					const delta = (choice as { delta?: unknown }).delta;
					if (!delta || typeof delta !== 'object') continue;

					const reasoning = (delta as { reasoning_content?: unknown }).reasoning_content;
					if (typeof reasoning === 'string' && reasoning.length > 0) {
						reasoningByChoice.set(idx, (reasoningByChoice.get(idx) ?? '') + reasoning);
					}

					const toolCalls = (delta as { tool_calls?: unknown }).tool_calls;
					if (Array.isArray(toolCalls)) {
						let ids = toolCallIdsByChoice.get(idx);
						if (!ids) {
							ids = new Set();
							toolCallIdsByChoice.set(idx, ids);
						}
						for (const tc of toolCalls) {
							const id = (tc as { id?: unknown })?.id;
							if (typeof id === 'string' && id.length > 0) ids.add(id);
						}
					}
				}
			}
		}
	} catch {
		// Ignore stream errors; capture is best-effort.
	} finally {
		reader.releaseLock();
	}

	for (const [idx, reasoning] of reasoningByChoice) {
		const ids = toolCallIdsByChoice.get(idx);
		if (!ids || !reasoning) continue;
		for (const id of ids) store.set(id, reasoning);
	}
}
