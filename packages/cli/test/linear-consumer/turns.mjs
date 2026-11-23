import assert from 'node:assert/strict';
import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { AgentTestRunService } from '../../src/modules/agents/agent-test-run.service';
import { AgentRuntimeReconstructionService } from '../../src/modules/agents/agent-runtime-reconstruction.service';
import { SimulationSessionService } from '../../src/modules/agents/simulation/simulation-session.service';
import { SimulationBackendRegistry } from '../../src/modules/agents/simulation/simulation-backend-registry';

import { AgentMessageQueueConsumer } from '../../src/modules/agents/agent-message-queue-consumer.service';
import { AgentsBuilderToolsService } from '../../src/modules/agents/builder/agents-builder-tools.service';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { withChatScope } from '../../src/modules/mcp-guard/chat-scope';
import { McpGuardService } from '../../src/modules/mcp-guard/mcp-guard.service';

// Stand-in for the real mcp.linear.app. It records every tool call that reaches it.
async function startUpstream(calls) {
	const team = { id: '22222222-2222-4222-8222-222222222222', key: 'FIN', name: 'Finance' };
	const issue = {
		id: '11111111-1111-4111-8111-111111111111',
		identifier: 'FIN-412',
		number: 412,
		title: 'Renew Initech',
		team,
		teamId: team.id,
	};
	const upstream = http.createServer(async (req, res) => {
		const body = await new Promise((r) => {
			let b = '';
			req.on('data', (c) => (b += c));
			req.on('end', () => r(b));
		});
		const mcp = new McpServer({ name: 'fake-linear', version: '0' });
		mcp.tool('get_issue', { id: z.string() }, async ({ id }) => {
			calls.push(['get_issue', id]);
			return { content: [{ type: 'text', text: JSON.stringify(issue) }] };
		});
		const t = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});
		await mcp.connect(t);
		await t.handleRequest(req, res, body ? JSON.parse(body) : undefined);
	});
	await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
	return upstream;
}

// Stand-in for the model of the agent under test. The guard asks it for a hydration plan.
// A read plan points at the call result. A write has no result, so its plan points at the
// pre-read of the issue (reads[0] is whoami, reads[1] is the issue).
const planFor = (src) =>
	JSON.stringify({
		reads: [],
		overlay: {
			world_version: 1,
			native: {
				linear: {
					teams: [
						{
							ref: 'team:FIN',
							id: `${src}.team.id`,
							key: `${src}.team.key`,
							name: `${src}.team.name`,
						},
					],
					issues: [
						{
							ref: 'FIN-412',
							id: `${src}.id`,
							team: 'team:FIN',
							number: `${src}.number`,
							title: `${src}.title`,
						},
					],
				},
			},
		},
		events: [],
	});

const stubModelFetch = async (input, init) => {
	const path = new URL(typeof input === 'string' ? input : (input.url ?? String(input))).pathname;
	const json = (body) =>
		new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
	if (!path.endsWith('/responses')) return json({});
	const prompt = typeof init?.body === 'string' ? init.body : '';
	const plan = planFor(/save_issue/.test(prompt) ? '$reads[1]' : '$result');
	return json({
		id: 'resp_stub',
		object: 'response',
		created_at: 0,
		status: 'completed',
		model: 'stub',
		output: [
			{
				type: 'message',
				id: 'msg_stub',
				role: 'assistant',
				status: 'completed',
				content: [{ type: 'output_text', text: plan, annotations: [] }],
			},
		],
		usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
	});
};

async function acceptance() {
	// The gym of the guard: admin API (default 9090) and MCP (default 8080).
	const base = process.env.AI_GYM_LINEAR_URL ?? 'http://127.0.0.1:9090',
		gymMcp = process.env.GYM_LINEAR_MCP_URL ?? 'http://127.0.0.1:8080/mcp';
	const upstreamCalls = [];
	const upstreamServer = process.env.LINEAR_UPSTREAM_URL
		? undefined
		: await startUpstream(upstreamCalls);
	const upstream =
		process.env.LINEAR_UPSTREAM_URL ?? `http://127.0.0.1:${upstreamServer.address().port}/mcp`;
	process.env.LINEAR_MCP_URL = upstream;
	for (const url of [base, gymMcp, upstream]) assert.equal(new URL(url).hostname, '127.0.0.1');
	// esbuild emits no decorator metadata, so DI cannot inject the logger by itself.
	Container.set(McpGuardService, new McpGuardService(Container.get(Logger)));
	const network = globalThis.fetch,
		ledger = [];
	let outage = false;
	globalThis.fetch = async (url, init) => {
		ledger.push(String(url));
		assert.ok(
			[new URL(base).origin, new URL(gymMcp).origin, new URL(upstream).origin].includes(
				new URL(url).origin,
			),
		);
		if (outage) throw Error('synthetic outage');
		return await network(url, { ...init, redirect: 'error' });
	};
	const server = {
		name: 'linear',
		url: 'https://mcp.linear.app/mcp',
		credential: 'fixture-ref',
		authentication: 'bearerAuth',
	};
	const marked = new Set();
	const sessions = new SimulationSessionService(
		console,
		{ isEnabled: () => true },
		new SimulationBackendRegistry(),
		{ findByIdAndProjectId: () => ({ schema: { name: 'fixture', mcpServers: [server] } }) },
		{ refsForDraft: () => [] },
		{
			findTestChatState: (id) => ({ testChat: marked.has(id) }),
			markTestChat: (id) => marked.add(id),
		},
		{ hasFinishedByThread: () => false },
		{},
		{},
	);
	const factory = AgentRuntimeReconstructionService.prototype.makeMcpClientFactory;
	const sentinel = () => {
		throw Error('Unexpected live transport');
	};
	// The guard reads its model and its model fetch from the factory. The stub answers both.
	const outboundHttp = { transport: () => ({ asCustomFetch: () => stubModelFetch }) };
	const select = async (options) =>
		await factory.call(
			{ outboundHttp },
			{
				credentialProvider: {},
				projectId: 'project',
				memoryOwnerAgentId: 'agent',
				config: { model: { id: 'openai/gpt-4o-mini', apiKey: 'fixture' } },
				...options,
			},
			sentinel,
			new Map(),
		)(server);
	// The scripted orchestrator replaces the model, MCP SDK, queue and execution store.
	const drafts = new AgentTestRunService(
		{ canUseDraftThread: () => true },
		{ validateAgentIsRunnable: () => ({ missing: [] }) },
		{
			async *executeForChat({ simulation, memory, message, onExecutionRecorded }) {
				const session = await simulation(memory.threadId);
				onExecutionRecorded('fixture-execution');
				if (!session) {
					assert.equal(await select({ runType: 'manual' }), sentinel);
					return;
				}
				await session.markTestChat();
				// A test chat gets the guarded fetch from the factory. No instrumentation is needed.
				const transport = await select({ runType: 'test' });
				const tool = { name: 'linear_' + message, mcpTool: true, mcpServerName: 'linear' };
				const args = {
					id: 'FIN-412',
					...(message === 'save_issue' ? { title: 'Fixture edit' } : {}),
				};
				const response = await withChatScope(
					memory.threadId,
					async () =>
						await transport(server.url, {
							method: 'POST',
							headers: {
								'content-type': 'application/json',
								accept: 'application/json, text/event-stream',
								authorization: 'Bearer fixture-token',
							},
							body: JSON.stringify({
								jsonrpc: '2.0',
								id: 1,
								method: 'tools/call',
								params: { name: message, arguments: args },
							}),
						}),
				);
				// The guard answers a failure of its own, such as a gym that is down, with a plain-text status.
				const text = await response.text();
				const result = response.ok ? JSON.parse(text) : { error: `${response.status} ${text}` };
				yield {
					type: 'tool-result',
					toolName: tool.name,
					toolCallId: 'fixture-call',
					output: result,
				};
				if (result) yield { type: 'text-delta', delta: JSON.stringify(result) };
			},
		},
		{},
		sessions,
	);
	async function turn(sessionId, id, message, mode = 'test', assistant = false) {
		const chunks = [];
		let result;
		if (assistant) {
			({ result } = await AgentsBuilderToolsService.prototype.runDraftTest.call(
				{ agentTestRunService: drafts },
				{},
				'agent',
				'project',
				message,
				sessionId,
				{},
				{ id },
			));
		} else {
			const testRunService = {
				prepareDraftRun: (input) => drafts.prepareDraftRun(input),
				executePreparedDraftRun: async (input) =>
					(result = await drafts.executePreparedDraftRun(input)),
			};
			await AgentMessageQueueConsumer.prototype.consumePreview.call(
				{ testRunService },
				{
					thread: { agentId: 'agent', projectId: 'project', id: sessionId },
					admission: { executionId: 'fixture-execution' },
					recording: { source: 'preview' },
					payload: { kind: 'preview', message, mode },
				},
				{ id },
				new AbortController().signal,
				(event) => {
					if (event.type === 'tool-result') chunks.push(event);
				},
			);
		}
		assert.equal(result.status, 'completed');
		return { body: result.response };
	}
	const gymTenants = async () =>
		(await (await network(`${base}/_sim/v1/tenants`)).json()).tenants.map((t) => t.tenant);
	const upstreamTools = () => upstreamCalls.map(([tool]) => tool);
	const guardTenants = async () => (await gymTenants()).filter((t) => t.startsWith('guard-agent-'));
	const clear = async () => {
		for (const t of await guardTenants())
			await network(`${base}/_sim/v1/tenants/${t}`, { method: 'DELETE' });
	};
	// Start from a clean gym: a tenant of an earlier run would hide a missing one.
	await clear();
	try {
		// A write goes to the gym. Only a read of the issue reaches the real service.
		const first = await turn('chat', 'owner', 'save_issue');
		assert.match(first.body, /Fixture edit/);
		assert.deepEqual([...new Set(upstreamTools())], ['get_issue']);
		const tenant = await guardTenants();
		assert.equal(tenant.length, 1);
		// The same chat reads its own write back, from the assistant path and from the preview path.
		const resumed = await turn('chat', 'owner', 'get_issue', undefined, true);
		assert.match(resumed.body, /Fixture edit/);
		const next = await turn('chat', 'owner', 'get_issue');
		assert.match(next.body, /Fixture edit/);
		assert.deepEqual(await guardTenants(), tenant);
		// A new chat starts from the real data in its own tenant. The guard keys the tenant by agent and
		// chat. Another owner of the same chat id is stopped earlier, by canUseDraftThread.
		const fresh = await turn('fresh', 'owner', 'get_issue');
		assert.match(fresh.body, /Renew Initech/);
		assert.doesNotMatch(fresh.body, /Fixture edit/);
		assert.ok((await guardTenants()).length > tenant.length);
		const calls = upstreamCalls.length;
		// An unknown tool goes only to the gym.
		await turn('chat', 'owner', 'delete_issue');
		assert.equal(upstreamCalls.length, calls);
		// A live chat and a run with its own MCP fetch never reach the network.
		const count = ledger.length;
		assert.ok(!(await turn('live', 'owner', 'get_issue', 'live')).body);
		// An evaluation run has its own MCP fetch. The guard stays out.
		assert.equal(
			await select({ runType: 'test', instrumentation: { mcpFetch: () => sentinel } }),
			sentinel,
		);
		assert.equal(await select({ runType: 'manual' }), sentinel);
		assert.equal(ledger.length, count);
		// With the gym down the call fails closed. A failed call never falls back to the real service.
		outage = true;
		const down = await turn('chat', 'owner', 'save_issue');
		assert.doesNotMatch(down.body, /Fixture edit/);
		assert.deepEqual(upstreamCalls.length, calls);
		outage = false;
		// The guard creates the tenant again when it is gone.
		await clear();
		const replaced = await turn('chat', 'owner', 'get_issue');
		assert.match(replaced.body, /Renew Initech/);
		console.log(
			'PASS draft turns, guard routing, isolation, selector, fail-closed and tenant recreation',
		);
	} finally {
		upstreamServer?.close();
	}
}
acceptance().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
