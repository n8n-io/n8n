import assert from 'node:assert/strict';
import { AgentTestRunService } from '../../src/modules/agents/agent-test-run.service';
import { AgentRuntimeReconstructionService } from '../../src/modules/agents/agent-runtime-reconstruction.service';
import { SimulationSessionService } from '../../src/modules/agents/simulation/simulation-session.service';
import { SimulationBackendRegistry } from '../../src/modules/agents/simulation/simulation-backend-registry';
import { SimulationBlockedError } from '../../src/modules/agents/simulation/simulation-session';

import { AgentMessageQueueConsumer } from '../../src/modules/agents/agent-message-queue-consumer.service';
import { AgentsBuilderToolsService } from '../../src/modules/agents/builder/agents-builder-tools.service';

async function acceptance() {
	const base = process.env.GYM_BASE_URL,
		upstream = process.env.LINEAR_UPSTREAM_URL;
	for (const url of [base, upstream]) assert.equal(new URL(url).hostname, '127.0.0.1');
	const network = globalThis.fetch,
		ledger = [];
	let outage = false;
	globalThis.fetch = async (url, init) => {
		const endpoint = new URL(url);
		assert.ok([base, new URL(upstream).origin].includes(endpoint.origin));
		const body = init?.body ? JSON.parse(init.body) : {};
		const op = {
			target: endpoint.origin === base ? 'gym' : 'upstream',
			path: endpoint.pathname,
			method: init?.method,
			tool: body.params?.name,
		};
		if (body.world) op.initialIssues = body.world.native?.linear?.issues?.length ?? 0;
		ledger.push(op);
		if (op.target === 'upstream') {
			assert.equal(String(url), upstream);
			assert.equal(op.method, 'POST');
			assert.equal(body.method, 'tools/call');
			assert.equal(op.tool, 'get_issue');
			assert.deepEqual(body.params.arguments, { id: 'FIN-412' });
			assert.match(new Headers(init.headers).get('x-fixture-scope') ?? '', /^[a-f0-9]{64}$/);
		}
		if (outage) {
			op.outage = true;
			throw Error('synthetic outage');
		}
		const response = await network(url, { ...init, redirect: 'error' });
		op.status = response.status;
		if (op.tool) {
			const { result } = await response.clone().json();
			op.toolError = result?.isError === true;
			if (!op.toolError && result) op.title = JSON.parse(result.content[0].text).title;
		}
		return response;
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
	const select = async (instrumentation) =>
		await factory.call({}, { instrumentation }, sentinel, new Map())(server);
	// The scripted orchestrator replaces the model, MCP SDK, queue and execution store.
	const drafts = new AgentTestRunService(
		{ canUseDraftThread: () => true },
		{ validateAgentIsRunnable: () => ({ missing: [] }) },
		{
			async *executeForChat({ simulation, memory, message, onExecutionRecorded }) {
				const session = await simulation(memory.threadId);
				onExecutionRecorded('fixture-execution');
				if (!session) {
					assert.equal(await select(undefined), sentinel);
					return;
				}
				await session.markTestChat();
				const transport = await select(session.instrumentation());
				const tool = { name: 'linear_' + message, mcpTool: true, mcpServerName: 'linear' };
				const args = {
					id: 'FIN-412',
					...(message === 'save_issue' ? { title: 'Fixture edit' } : {}),
				};
				let result;
				try {
					result = await session.interceptor(
						{ tool, toolCallId: 'fixture-call' },
						async () =>
							await (
								await transport(server.url, {
									method: 'POST',
									body: JSON.stringify({
										jsonrpc: '2.0',
										id: 1,
										method: 'tools/call',
										params: { name: message, arguments: args },
									}),
								})
							).json(),
					);
				} catch (e) {
					if (!(e instanceof SimulationBlockedError)) throw e;
				}
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
		if (!assistant && mode === 'test') assert.equal(chunks.length, 1);
		if (chunks.length) {
			const { toolName, toolCallId, ...decision } = result.simulation.toolCalls[0];
			assert.deepEqual(chunks[0].simulation, decision);
		}
		const decision = result.simulation?.toolCalls[0];
		return {
			world: result.simulation?.worldId,
			reason: decision?.reason,
			evidence: decision?.evidence,
			body: result.response,
		};
	}
	let expectedUpstream = 0;
	async function step(label, reads, args, title, evidence) {
		const start = ledger.length;
		const result = await turn(...args);
		const ops = ledger.slice(start);
		const actualTitle = result.body
			? JSON.parse(JSON.parse(result.body).result.content[0].text).title
			: undefined;
		console.log(
			JSON.stringify({
				step: label,
				chat: args[0],
				owner: args[1],
				world: result.world,
				reason: result.reason,
				evidence: result.evidence,
				title: actualTitle,
				ops,
			}),
		);
		assert.equal(ops.filter((op) => op.target === 'upstream').length, reads, label);
		expectedUpstream += reads;
		assert.equal(actualTitle, title, label);
		if (evidence) {
			assert.equal(result.reason, 'served_from_world');
			assert.deepEqual(result.evidence, evidence, label);
			// The evidence must agree with the requests that the recorder saw in this turn.
			assert.equal(evidence.includes('real_read'), reads > 0, label);
			assert.ok(result.world);
			assert.equal(ops.at(-1)?.tool, args[2]);
			assert.equal(ops.at(-1)?.target, 'gym');
			assert.equal(ops.at(-1)?.title, title);
			const tenant = '/_sim/v1/tenants/' + result.world;
			// The guard reads the real service, seeds what the Gym lacks, then answers from the Gym.
			// The test checks that order and the data. It does not count the probe calls of the router.
			const isUpstream = (op) => op.target === 'upstream';
			const isTenant = (op) => op.method === 'PUT' && op.path === tenant;
			const isSeed = (op) => op.path === `${tenant}/seed`;
			const answer = ops.length - 1;
			// The real service always shows the original title. Only the Gym holds the edit.
			for (const op of ops.filter(isUpstream)) assert.equal(op.title, original, label);
			if (ops.some(isTenant)) {
				// A new world is created first, empty, and is seeded from a real read before it answers.
				assert.equal(ops.findIndex(isTenant), 0, label);
				assert.equal(ops.find(isTenant).initialIssues, 0, label);
				assert.ok(ops.findIndex(isUpstream) < ops.findIndex(isSeed), label);
				assert.ok(ops.findIndex(isSeed) < answer, label);
			} else {
				// A world that exists already is not seeded again.
				assert.ok(!ops.some(isSeed), label);
				// A read still goes to the real service before the Gym answers.
				if (reads > 0) assert.ok(ops.findIndex(isUpstream) < answer, label);
			}
		}
		return { ...result, ops };
	}
	const original = 'Renew Initech';
	const READ = ['real_read', 'world_read'];
	const WRITE = ['world_write'];
	const initial = await step('empty-world read', 1, ['chat', 'owner', 'get_issue'], original, READ);
	assert.equal(initial.ops[0].initialIssues, 0);
	assert.ok(initial.ops[0].path.endsWith('/' + initial.world));
	const first = await step('local edit', 0, ['chat', 'owner', 'save_issue'], 'Fixture edit', WRITE);
	assert.equal(first.world, initial.world);
	assert.equal(first.reason, 'served_from_world');
	assert.ok(first.world);
	const resumed = await step(
		'assistant read',
		1,
		['chat', 'owner', 'get_issue', undefined, true],
		'Fixture edit',
		READ,
	);
	assert.equal(resumed.world, first.world);
	assert.match(resumed.body, /Fixture edit/);
	const next = await step('repeat read', 1, ['chat', 'owner', 'get_issue'], 'Fixture edit', READ);
	assert.equal(next.world, first.world);
	assert.match(next.body, /Fixture edit/);
	// The guard reads the real service before every read, also for an issue that the Gym holds. It does
	// not seed that issue again. The Gym keeps the edit and answers, so the title stays 'Fixture edit'.
	for (const [chat, owner] of [
		['fresh', 'owner'],
		['chat', 'other'],
	]) {
		const fresh = await step(
			`fresh ${chat}/${owner}`,
			1,
			[chat, owner, 'get_issue'],
			original,
			READ,
		);
		assert.notEqual(fresh.world, first.world);
		assert.match(fresh.body, /Renew Initech/);
	}
	const writeFirst = await step(
		'write-first edit',
		1,
		['write-first', 'owner', 'save_issue'],
		'Fixture edit',
		['real_read', 'world_write'],
	);
	assert.notEqual(writeFirst.world, first.world);

	const count = ledger.length;
	assert.equal(
		(await step('unsupported', 0, ['chat', 'owner', 'delete_issue'])).reason,
		'unsupported_by_simulator',
	);
	assert.equal((await turn('live', 'owner', 'get_issue', 'live')).world, undefined);
	assert.equal(await select({}), sentinel); // Evaluation instrumentation without an MCP override.
	assert.equal(ledger.length, count);
	outage = true;
	assert.equal(
		(await step('outage', 0, ['chat', 'owner', 'save_issue'])).reason,
		'simulator_unavailable',
	);
	assert.deepEqual(
		ledger.slice(count).map((op) => [op.target, op.path, op.tool]),
		[['gym', '/mcp', 'save_issue']],
	);
	outage = false;
	server.credential = 'replacement-fixture-ref';
	const replaced = await step(
		'credential replacement',
		1,
		['chat', 'owner', 'get_issue'],
		original,
		READ,
	);
	assert.notEqual(replaced.world, first.world);
	assert.match(replaced.body, /Renew Initech/);
	assert.equal(ledger.filter((op) => op.target === 'upstream').length, expectedUpstream);
	console.log('PASS draft turns, cache, owner, isolation, selector and fail-closed decisions');
}
acceptance().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
