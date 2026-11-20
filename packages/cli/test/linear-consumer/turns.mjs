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
		ledger.push(String(url));
		assert.ok([base, new URL(upstream).origin].includes(new URL(url).origin));
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
	const first = await turn('chat', 'owner', 'save_issue');
	assert.equal(first.reason, 'served_from_world');
	assert.ok(first.world);
	assert.deepEqual(first.evidence, ['fixture_seed', 'gym_only_write']);
	const resumed = await turn('chat', 'owner', 'get_issue', undefined, true);
	assert.equal(resumed.world, first.world);
	assert.match(resumed.body, /Fixture edit/);
	assert.deepEqual(resumed.evidence, ['fixture_seed', 'gym_read']);
	const next = await turn('chat', 'owner', 'get_issue');
	assert.equal(next.world, first.world);
	assert.match(next.body, /Fixture edit/);
	for (const [chat, owner] of [
		['fresh', 'owner'],
		['chat', 'other'],
	]) {
		const fresh = await turn(chat, owner, 'get_issue');
		assert.notEqual(fresh.world, first.world);
		assert.match(fresh.body, /Renew Initech/);
	}
	assert.equal(ledger.filter((u) => u === upstream).length, 3);
	const count = ledger.length;
	assert.equal((await turn('chat', 'owner', 'delete_issue')).reason, 'unsupported_by_simulator');
	assert.equal((await turn('live', 'owner', 'get_issue', 'live')).world, undefined);
	assert.equal(await select({}), sentinel); // Evaluation instrumentation without an MCP override.
	assert.equal(ledger.length, count);
	outage = true;
	assert.equal((await turn('chat', 'owner', 'save_issue')).reason, 'simulator_unavailable');
	assert.deepEqual(ledger.slice(count), [base + '/mcp']);
	outage = false;
	server.credential = 'replacement-fixture-ref';
	const replaced = await turn('chat', 'owner', 'get_issue');
	assert.notEqual(replaced.world, first.world);
	assert.match(replaced.body, /Renew Initech/);
	assert.equal(ledger.filter((u) => u === upstream).length, 4);
	console.log('PASS draft turns, cache, owner, isolation, selector and fail-closed decisions');
}
acceptance().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
