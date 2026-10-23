// Routing experiment only: hide every "n8n" from the orchestrator model, identifiers included.
// It tests if the model's prior knowledge of n8n (agent = AI Agent node in a workflow) causes the workflow lean.
// The model's tool calls are mapped back, so tools still get real tool names and node ids.

export const BRAND_NAME = 'Zentrova';

// Standalone "n8n" in prose. Identifiers (@n8n/, n8n-nodes-base, n8n_nodes, N8N_) get the lowercase form.
const PRODUCT_NAME = /(?<![@\w./-])n8n(?![\w/-])/gi;

export function renameBrand(text: string): string {
	return text
		.replace(/\b([Aa])n (?=n8n(?![\w/-]))/g, '$1 ')
		.replace(PRODUCT_NAME, BRAND_NAME)
		.replace(/N8N/g, BRAND_NAME.toUpperCase())
		.replace(/n8n/gi, BRAND_NAME.toLowerCase());
}

export function restoreBrand(text: string): string {
	return text
		.replace(new RegExp(BRAND_NAME.toUpperCase(), 'g'), 'N8N')
		.replace(new RegExp(BRAND_NAME, 'gi'), 'n8n');
}

function mapStrings(value: unknown, map: (text: string) => string): unknown {
	if (typeof value === 'string') return map(value);
	if (Array.isArray(value)) return value.map((item) => mapStrings(item, map));
	if (typeof value !== 'object' || value === null) return value;
	// Signed thinking blocks must stay byte-equal, and base64 sources must not change.
	if ('type' in value && (value.type === 'thinking' || value.type === 'redacted_thinking')) {
		return value;
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, inner]) => [
			key,
			key === 'source' ? inner : mapStrings(inner, map),
		]),
	);
}

type RequestBody = { tools?: Array<{ name?: unknown }> };

// Only the orchestrator: the judge and the user proxy keep the real name.
function isOrchestrator(body: RequestBody): boolean {
	return (
		body.tools?.some(
			(tool) => typeof tool.name === 'string' && tool.name.endsWith('select_agent'),
		) ?? false
	);
}

export function renameRequestBody(body: RequestBody): unknown {
	return isOrchestrator(body) ? mapStrings(body, renameBrand) : body;
}

type SseEvent = {
	type?: string;
	index?: number;
	content_block?: { type?: string; name?: string };
	delta?: { type?: string; partial_json?: string };
};

const toSse = (event: SseEvent) => `event: ${event.type}\ndata: ${JSON.stringify(event)}`;

// Tool input arrives as JSON fragments, and a name can split across two fragments.
// So the fragments are joined per block and sent again as one restored fragment.
export function restoreStream(sse: string): string {
	const inputs = new Map<number, string>();
	const out: string[] = [];
	for (const chunk of sse.split('\n\n')) {
		const data = chunk.split('\n').find((line) => line.startsWith('data: '));
		if (!data) {
			out.push(chunk);
			continue;
		}
		const event = JSON.parse(data.slice('data: '.length)) as SseEvent;
		const index = event.index ?? -1;
		if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
			const name = event.content_block.name ?? '';
			out.push(
				toSse({ ...event, content_block: { ...event.content_block, name: restoreBrand(name) } }),
			);
			continue;
		}
		if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
			inputs.set(index, (inputs.get(index) ?? '') + (event.delta.partial_json ?? ''));
			continue;
		}
		const input = inputs.get(index);
		if (event.type === 'content_block_stop' && input !== undefined) {
			out.push(
				toSse({
					type: 'content_block_delta',
					index,
					delta: { type: 'input_json_delta', partial_json: restoreBrand(input) },
				}),
			);
			inputs.delete(index);
		}
		out.push(chunk);
	}
	return out.join('\n\n');
}

type MessageResponse = { content?: Array<{ type?: string; name?: string; input?: unknown }> };

function restoreMessage(message: MessageResponse): MessageResponse {
	return {
		...message,
		content: message.content?.map((block) =>
			block.type === 'tool_use'
				? {
						...block,
						name: restoreBrand(block.name ?? ''),
						input: mapStrings(block.input, restoreBrand),
					}
				: block,
		),
	};
}

// shortcut: buffers the whole stream before the SDK reads it, fine for evals, never for production.
async function restoreResponse(response: Response): Promise<Response> {
	if (!response.ok) return response;
	const text = await response.text();
	const isStream = response.headers.get('content-type')?.includes('text/event-stream') ?? false;
	const body = isStream
		? restoreStream(text)
		: JSON.stringify(restoreMessage(JSON.parse(text) as MessageResponse));
	const headers = new Headers(response.headers);
	headers.delete('content-length');
	headers.delete('content-encoding');
	return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	if (!url.includes('/v1/messages') || typeof init?.body !== 'string') {
		return await originalFetch(input, init);
	}
	const parsed = JSON.parse(init.body) as RequestBody;
	if (!isOrchestrator(parsed)) return await originalFetch(input, init);
	const body = JSON.stringify(mapStrings(parsed, renameBrand));
	return await restoreResponse(await originalFetch(input, { ...init, body }));
};
