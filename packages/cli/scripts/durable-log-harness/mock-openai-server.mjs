/**
 * Scripted OpenAI-compatible mock server for the durable-log crash-resume
 * E2E scenario (no real LLM needed). Point n8n at it with:
 *   N8N_INSTANCE_AI_MODEL=openai/mock-model
 *   N8N_INSTANCE_AI_MODEL_URL=http://127.0.0.1:<port>/v1
 *   N8N_INSTANCE_AI_MODEL_API_KEY=sk-test
 *
 * Modes (switched via POST /__mode {"mode": "..."}):
 *   script   - first tools-bearing request answers with ONE benign tool call
 *              (picked from the request's own tools list), the next
 *              tools-bearing request PARKS forever (the crash window);
 *              requests without tools (title refinement etc.) get quick text.
 *   complete - every request gets quick text with finish_reason stop.
 *
 * GET /__state reports {toolsRequests, hanging, mode} so the harness knows
 * when the run is inside the crash window.
 */
import http from 'node:http';

const state = {
	mode: 'script',
	toolsRequests: 0,
	hanging: false,
	parked: [],
};

function sseChunk(res, payload) {
	res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function chunkEnvelope(extra) {
	return {
		id: 'chatcmpl-mock',
		object: 'chat.completion.chunk',
		created: Math.floor(Date.now() / 1000),
		model: 'mock-model',
		...extra,
	};
}

function streamText(res, text, { includeUsage }) {
	res.writeHead(200, {
		'content-type': 'text/event-stream; charset=utf-8',
		'cache-control': 'no-cache',
	});
	sseChunk(res, chunkEnvelope({
		choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }],
	}));
	sseChunk(res, chunkEnvelope({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }));
	if (includeUsage) {
		sseChunk(res, chunkEnvelope({
			choices: [],
			usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
		}));
	}
	res.write('data: [DONE]\n\n');
	res.end();
}

/** Fill a JSON schema's required properties with benign values. */
function synthesizeArgs(parameters) {
	const args = {};
	const props = parameters?.properties ?? {};
	for (const name of parameters?.required ?? []) {
		const prop = props[name] ?? {};
		if (Array.isArray(prop.enum) && prop.enum.length > 0) args[name] = prop.enum[0];
		else if (prop.type === 'number' || prop.type === 'integer') args[name] = 1;
		else if (prop.type === 'boolean') args[name] = false;
		else if (prop.type === 'array') args[name] = [];
		else if (prop.type === 'object') args[name] = {};
		else args[name] = 'test';
	}
	return args;
}

function pickTool(tools) {
	const named = tools.map((t) => t.function ?? t);
	const preferred =
		named.find((t) => /search-workflows|list-workflows/.test(t.name)) ??
		named.find((t) => /^(search|list|get)[-_]/.test(t.name)) ??
		named.find((t) => /search|list/.test(t.name)) ??
		named[0];
	return preferred;
}

function streamToolCall(res, tool, { includeUsage }) {
	res.writeHead(200, {
		'content-type': 'text/event-stream; charset=utf-8',
		'cache-control': 'no-cache',
	});
	const args = JSON.stringify(synthesizeArgs(tool.parameters));
	sseChunk(res, chunkEnvelope({
		choices: [{
			index: 0,
			delta: {
				role: 'assistant',
				tool_calls: [{ index: 0, id: 'call_mock_1', type: 'function', function: { name: tool.name, arguments: '' } }],
			},
			finish_reason: null,
		}],
	}));
	sseChunk(res, chunkEnvelope({
		choices: [{
			index: 0,
			delta: { tool_calls: [{ index: 0, function: { arguments: args } }] },
			finish_reason: null,
		}],
	}));
	sseChunk(res, chunkEnvelope({ choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }));
	if (includeUsage) {
		sseChunk(res, chunkEnvelope({
			choices: [],
			usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
		}));
	}
	res.write('data: [DONE]\n\n');
	res.end();
}

const server = http.createServer((req, res) => {
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		if (req.url === '/__mode' && req.method === 'POST') {
			const { mode } = JSON.parse(body || '{}');
			state.mode = mode;
			// Leaving script mode releases nothing: parked responses stay parked
			// (they belong to the killed process anyway).
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ ok: true, mode: state.mode }));
			return;
		}
		if (req.url === '/__state') {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({
				mode: state.mode,
				toolsRequests: state.toolsRequests,
				hanging: state.hanging,
			}));
			return;
		}
		if (req.url?.endsWith('/embeddings') && req.method === 'POST') {
			const input = JSON.parse(body || '{}').input;
			const n = Array.isArray(input) ? input.length : 1;
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({
				object: 'list',
				data: Array.from({ length: n }, (_, index) => ({
					object: 'embedding',
					index,
					embedding: Array.from({ length: 256 }, () => 0.001),
				})),
				model: 'mock-embed',
				usage: { prompt_tokens: 1, total_tokens: 1 },
			}));
			return;
		}
		if (req.url?.endsWith('/chat/completions') && req.method === 'POST') {
			const request = JSON.parse(body || '{}');
			const includeUsage = Boolean(request.stream_options?.include_usage);
			const hasTools = Array.isArray(request.tools) && request.tools.length > 0;

			if (state.mode === 'complete' || !hasTools) {
				streamText(res, 'All done from the mock model.', { includeUsage });
				return;
			}

			state.toolsRequests++;
			if (state.toolsRequests === 1) {
				streamToolCall(res, pickTool(request.tools), { includeUsage });
				return;
			}
			// Crash window: park this response forever; the harness kills -9 now.
			state.hanging = true;
			state.parked.push(res);
			return;
		}
		res.writeHead(404, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ error: `mock: no route for ${req.method} ${req.url}` }));
	});
});

const port = Number(process.env.MOCK_LLM_PORT ?? 0);
server.listen(port, '127.0.0.1', () => {
	// Single parseable line so a parent process can grab the port.
	console.log(`MOCK_LLM_LISTENING ${server.address().port}`);
});
