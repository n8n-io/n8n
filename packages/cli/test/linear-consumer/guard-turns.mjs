import assert from 'node:assert/strict';
import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { isMcpGuardActive, withMcpGuard } from '../../src/modules/mcp-guard/mcp-guard-fetch';
import { withChatScope } from '../../src/modules/mcp-guard/chat-scope';
import { McpGuardService } from '../../src/modules/mcp-guard/mcp-guard.service';
import { Container } from '@n8n/di';

const TEAM = { id: '22222222-2222-4222-8222-222222222222', key: 'FIN', name: 'Finance' };
const ISSUE = { id: '11111111-1111-4111-8111-111111111111', identifier: 'FIN-412', number: 412, title: 'Renew Initech', team: TEAM, teamId: TEAM.id };
const upstreamCalls = [];
const llmCalls = [];

// Stand-in for the real mcp.linear.app: records every call that reaches it.
const upstream = http.createServer(async (req, res) => {
	const body = await new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
	const mcp = new McpServer({ name: 'fake-linear', version: '0' });
	mcp.tool('get_issue', { id: z.string() }, async (a) => {
		upstreamCalls.push(['get_issue', a.id]);
		return { content: [{ type: 'text', text: JSON.stringify(ISSUE) }] };
	});
	const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
	await mcp.connect(t);
	await t.handleRequest(req, res, body ? JSON.parse(body) : undefined);
});
await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
process.env.LINEAR_MCP_URL = `http://127.0.0.1:${upstream.address().port}/mcp`;

// A read plan points at the call result. A write has no result, so its plan points at the pre-read (reads[0] is whoami, reads[1] the issue).
const planFor = (src) => JSON.stringify({
	reads: [],
	overlay: {
		world_version: 1,
		native: { linear: {
			teams: [{ ref: 'team:FIN', id: `${src}.team.id`, key: `${src}.team.key`, name: `${src}.team.name` }],
			issues: [{ ref: 'FIN-412', id: `${src}.id`, team: 'team:FIN', number: `${src}.number`, title: `${src}.title` }],
		} },
	},
	events: [],
});

// Stand-in for the model of the agent under test: always answers with the plan.
const llmFetch = async (input, init) => {
	const path = new URL(typeof input === 'string' ? input : (input.url ?? String(input))).pathname;
	llmCalls.push(path);
	const prompt = typeof init?.body === 'string' ? init.body : '';
	const PLAN = planFor(/save_issue/.test(prompt) ? '$reads[1]' : '$result');
	const json = (body) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
	if (!path.endsWith('/responses')) return json({});
	return json({
		id: 'resp_stub', object: 'response', created_at: 0, status: 'completed', model: 'stub',
		output: [{ type: 'message', id: 'msg_stub', role: 'assistant', status: 'completed',
			content: [{ type: 'output_text', text: PLAN, annotations: [] }] }],
		usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
	});
};

Container.set(McpGuardService, new McpGuardService({ error: console.error, warn: console.warn, info() {}, debug() {} }));

const baseFetch = async () => { throw new Error('guarded call must not reach baseFetch'); };
const guarded = withMcpGuard(baseFetch, 'agent', {
	resolve: async () => ({ id: 'openai/gpt-4o-mini', apiKey: 'stub' }),
	fetch: llmFetch,
});

async function call(chat, name, args) {
	return await withChatScope(chat, async () => {
		const res = await guarded('https://mcp.linear.app/mcp', {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer fixture-token' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
		});
		return await res.json();
	});
}

const text = (res) => res.result.content[0].text;
const GYM = 'http://127.0.0.1:9090';

try {
	// A write goes to the gym. The real service never sees it.
	const write = await call('chat', 'save_issue', { id: 'FIN-412', title: 'Fixture edit' });
	assert.ok(!write.result.isError, text(write));
	assert.match(text(write), /Fixture edit/);
	assert.ok(upstreamCalls.every(([tool]) => tool === 'get_issue'), 'only a read reached upstream');

	// The same chat sees its own write.
	const same = await call('chat', 'get_issue', { id: 'FIN-412' });
	assert.match(text(same), /Fixture edit/);

	// Another chat of the same agent starts from the real data.
	const other = await call('fresh', 'get_issue', { id: 'FIN-412' });
	assert.match(text(other), /Renew Initech/);
	assert.doesNotMatch(text(other), /Fixture edit/);

	// An unknown tool goes only to the gym. Upstream only has get_issue, so a leak would fail loudly.
	const before = upstreamCalls.length;
	const unknown = await call('chat', 'delete_issue', { id: 'FIN-412' });
	assert.equal(upstreamCalls.length, before);
	assert.ok(unknown.result.isError || /not|unsupported/i.test(text(unknown)));

	// The guard is off for evaluation runs (own MCP fetch) and for non-test runs.
	assert.equal(isMcpGuardActive('test', true), false);
	assert.equal(isMcpGuardActive('live', false), false);
	assert.equal(isMcpGuardActive('test', false), true);

	// The guard creates the tenant again when it is gone.
	const tenants = await (await fetch(`${GYM}/_sim/v1/tenants`)).json();
	const mine = (tenants.tenants ?? tenants).map((t) => t.tenant).filter((id) => String(id).startsWith('guard-agent-chat'));
	assert.ok(mine.length > 0, 'tenant for the chat exists');
	for (const id of mine) await fetch(`${GYM}/_sim/v1/tenants/${id}`, { method: 'DELETE' });
	const again = await call('chat', 'get_issue', { id: 'FIN-412' });
	assert.match(text(again), /Renew Initech/);

	console.log('PASS guard routing, per-chat tenants, unknown tool, guard gating and tenant recreation');
} catch (e) {
	console.error(e);
	process.exitCode = 1;
} finally {
	upstream.close();
}
