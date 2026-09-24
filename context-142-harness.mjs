#!/usr/bin/env node
// SPIKE (CONTEXT-142) ground-truth harness for the save_user_preference MCP
// tool. Drives the raw 2026-07-28 MRTR wire shape (and the 2025 stateless
// legacy leg) against a local n8n so client failures are distinguishable from
// server bugs.
//
// Usage: MCP_TOKEN=<api key JWT> node context-142-harness.mjs [baseUrl]

const BASE_URL = process.argv[2] ?? 'http://localhost:5678';
const TOKEN = process.env.MCP_TOKEN;
if (!TOKEN) {
	console.error('Set MCP_TOKEN to the MCP api key JWT');
	process.exit(1);
}

const ENDPOINT = `${BASE_URL}/mcp-server/http`;
const REVISION = '2026-07-28';
const META = {
	'io.modelcontextprotocol/protocolVersion': REVISION,
	'io.modelcontextprotocol/clientInfo': { name: 'context-142-harness', version: '0.0.1' },
};
const CAPS_KEY = 'io.modelcontextprotocol/clientCapabilities';

let nextId = 1;

async function rpc(method, params, { legacy = false } = {}) {
	const body = { jsonrpc: '2.0', id: nextId++, method, params };
	const headers = {
		authorization: `Bearer ${TOKEN}`,
		'content-type': 'application/json',
		accept: 'application/json, text/event-stream',
	};
	// 2026-07-28 routing headers: the method (and protocol version) ride the
	// HTTP layer so proxies can route without parsing the body.
	if (!legacy) {
		headers['mcp-method'] = method;
		headers['mcp-protocol-version'] = REVISION;
		if (params?.name) headers['mcp-name'] = params.name;
	}
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});
	const contentType = res.headers.get('content-type') ?? '';
	const text = await res.text();
	if (contentType.includes('text/event-stream')) {
		// Take the last data: line carrying our response id.
		const messages = text
			.split('\n')
			.filter((line) => line.startsWith('data: '))
			.map((line) => JSON.parse(line.slice(6)));
		const response = messages.find((m) => m.id === body.id) ?? messages.at(-1);
		return { http: res.status, response, transport: 'sse' };
	}
	return { http: res.status, response: text ? JSON.parse(text) : undefined, transport: 'json' };
}

function callTool(args, { caps, retry } = {}) {
	const _meta = { ...META };
	if (caps !== undefined) _meta[CAPS_KEY] = caps;
	return rpc('tools/call', {
		name: 'save_user_preference',
		arguments: args,
		_meta,
		...(retry ?? {}),
	});
}

// 2025-era request: no envelope, no routing headers → the stateless legacy leg.
function callToolLegacy(args) {
	return rpc('tools/call', { name: 'save_user_preference', arguments: args }, { legacy: true });
}

function summarize(label, { http, response, transport }) {
	const result = response?.result;
	const error = response?.error;
	const line = {
		http,
		transport,
		resultType: result?.resultType,
		inputRequestKeys: result?.inputRequests ? Object.keys(result.inputRequests) : undefined,
		structuredContent: result?.structuredContent,
		text: result?.content?.[0]?.text?.slice(0, 140),
		error: error ? { code: error.code, message: error.message?.slice(0, 140) } : undefined,
	};
	console.log(`\n=== ${label}`);
	console.log(JSON.stringify(line, null, 2));
	return { result, error };
}

const ELICIT_CAPS = { elicitation: { form: {} } };
const NO_ELICIT_CAPS = {};

// --- scenarios ---------------------------------------------------------

// 0. Tool visible?
{
	const r = await rpc('tools/list', { _meta: { ...META, [CAPS_KEY]: NO_ELICIT_CAPS } });
	const tools = r.response?.result?.tools?.map((t) => t.name) ?? [];
	console.log('=== tools/list');
	console.log({ http: r.http, hasTool: tools.includes('save_user_preference'), count: tools.length });
}

// 1. Modern + elicitation capability → expect input_required.
const first = await callTool(
	{ content: 'Harness A: always add error handling nodes to my workflows' },
	{ caps: ELICIT_CAPS },
);
const { result: round1 } = summarize('1. first round, elicitation-capable', first);

// 2. Retry with accept + confirm true → expect saved.
if (round1?.resultType === 'input_required') {
	const retryAccept = await callTool(
		{ content: 'Harness A: always add error handling nodes to my workflows' },
		{
			caps: ELICIT_CAPS,
			retry: { inputResponses: { confirm: { action: 'accept', content: { confirm: true } } } },
		},
	);
	summarize('2. retry accept confirm=true', retryAccept);

	// 3. accept but confirm=false.
	const retryNo = await callTool(
		{ content: 'Harness B: never happens' },
		{
			caps: ELICIT_CAPS,
			retry: { inputResponses: { confirm: { action: 'accept', content: { confirm: false } } } },
		},
	);
	summarize('3. retry accept confirm=false', retryNo);

	// 4. decline.
	const retryDecline = await callTool(
		{ content: 'Harness C: never happens' },
		{ caps: ELICIT_CAPS, retry: { inputResponses: { confirm: { action: 'decline' } } } },
	);
	summarize('4. retry decline', retryDecline);

	// 5. cancel.
	const retryCancel = await callTool(
		{ content: 'Harness D: never happens' },
		{ caps: ELICIT_CAPS, retry: { inputResponses: { confirm: { action: 'cancel' } } } },
	);
	summarize('5. retry cancel', retryCancel);
}

// 6. Modern, no elicitation capability, unconfirmed → fallback instruction.
const fb = await callTool(
	{ content: 'Harness E: prefer Postgres over MySQL nodes' },
	{ caps: NO_ELICIT_CAPS },
);
summarize('6. no capability, unconfirmed (fallback ask)', fb);

// 7. Modern, no capability, confirmed:true → model-mediated save.
const fbConfirmed = await callTool(
	{ content: 'Harness E: prefer Postgres over MySQL nodes', confirmed: true },
	{ caps: NO_ELICIT_CAPS },
);
summarize('7. no capability, confirmed=true (model-mediated save)', fbConfirmed);

// 8. 2025-era stateless legacy leg → expect the fallback branch too.
const legacy = await callToolLegacy({
	content: 'Harness F: legacy leg preference',
});
summarize('8. legacy stateless leg, unconfirmed', legacy);

console.log('\nDone. Check the n8n log for [CONTEXT-142] probe lines and the DB/settings UI for saved rows.');
