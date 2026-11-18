import {
	Agent,
	Workspace,
	type BuiltTool,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';

import { createAgentImprovementAgent } from '../agent-improvement-agent';
import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import {
	AGENT_IMPROVEMENT_PROFILE_VERSION,
	type AgentImprovementHostTools,
} from '../../agent-improvement';
import type { InstanceAiContext } from '../../types';

const HOST_TOOL_NAMES = [
	'check_report',
	'get_agent_definition',
	'list_eval_cases',
	'list_production_sessions',
	'read_production_session',
	'test_proposal',
];

const WORKSPACE_TOOL_NAMES = [
	'workspace_read_file',
	'workspace_read_files',
	'workspace_read_tool_result',
	'workspace_write_file',
	'workspace_edit_files',
	'workspace_str_replace_file',
	'workspace_execute_command',
];

const noChange = {
	outcome: 'no_change',
	summary: 'No change needed',
	report:
		'**What we found**\n\nNo problem.\n\n**What changed**\n\nNo changes were made.\n\n' +
		'**Test results**\n\nNo test ran.',
};

function createContext(): InstanceAiContext {
	return mock<InstanceAiContext>({ threadId: undefined, tracing: undefined, workspace: undefined });
}

function createHostTools() {
	return {
		getAgentDefinition: vi
			.fn<AgentImprovementHostTools['getAgentDefinition']>()
			.mockResolvedValue({ goals: ['quality'] }),
		listEvalCases: vi
			.fn<AgentImprovementHostTools['listEvalCases']>()
			.mockResolvedValue({ cases: [] }),
		listProductionSessions: vi
			.fn<AgentImprovementHostTools['listProductionSessions']>()
			.mockResolvedValue({ total: 0, sessions: [] }),
		readProductionSession: vi
			.fn<AgentImprovementHostTools['readProductionSession']>()
			.mockResolvedValue({ error: 'Not found' }),
		testProposal: vi
			.fn<AgentImprovementHostTools['testProposal']>()
			.mockResolvedValue({ ok: true, cases: [] }),
	};
}

function findTool(tools: BuiltTool[], name: string): BuiltTool {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool) throw new Error(`Missing tool: ${name}`);
	return tool;
}

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

function modelTurn(parts: MockStreamPart[], callsTool = false): MockStreamResult {
	return {
		stream: convertArrayToReadableStream<MockStreamPart>([
			{ type: 'stream-start', warnings: [] },
			...parts,
			{
				type: 'finish',
				finishReason: {
					unified: callsTool ? 'tool-calls' : 'stop',
					raw: callsTool ? 'tool_calls' : 'stop',
				},
				usage: {
					inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
					outputTokens: { total: 5, text: 5, reasoning: 0 },
				},
			},
		]),
	};
}

function toolTurn(toolName: string, input: unknown): MockStreamResult {
	return modelTurn(
		[{ type: 'tool-call', toolCallId: toolName, toolName, input: JSON.stringify(input) }],
		true,
	);
}

function outputTurn(output: Record<string, unknown>): MockStreamResult {
	return modelTurn([
		{ type: 'text-start', id: 'result' },
		{ type: 'text-delta', id: 'result', delta: JSON.stringify(output) },
		{ type: 'text-end', id: 'result' },
	]);
}

function modelWithTurns(turns: MockStreamResult[]) {
	return new MockLanguageModelV3({
		doStream: async () => {
			const turn = turns.shift();
			if (!turn) throw new Error('Unexpected model call');
			return turn;
		},
	});
}

describe('createAgentImprovementAgent', () => {
	beforeEach(() => {
		// Keep model pricing requests offline.
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('gives the model only the investigation tools and the investigation prompt', async () => {
		const model = modelWithTurns([outputTurn(noChange)]);
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: model,
			tools: createHostTools(),
		});
		const { stream } = await agent.stream('Investigate the agent.');
		await stream.pipeTo(new WritableStream());

		const request = model.doStreamCalls[0];
		const instructions = request.prompt
			.filter((message) => message.role === 'system')
			.map((message) => message.content)
			.join('\n');

		expect(request.tools?.map((tool) => tool.name).sort()).toEqual([...HOST_TOOL_NAMES].sort());
		expect(request.responseFormat).toMatchObject({
			type: 'json',
			schema: { required: ['outcome', 'summary', 'report'] },
		});
		expect(agent.name).toBe('n8n-agent-improvement-agent');
		expect(instructions).toContain('# Agent improvement');
		expect(instructions).toContain('<untrusted_data>');
		expect(instructions).toContain(
			'The last successful test_proposal call is the proposal. Run it again with the\n' +
				'final edits and cases before you answer.',
		);
		expect(instructions).toContain('An MCP\ntool cannot be an expected tool');
		expect(instructions).toContain('marked as not editable');
		expect(instructions).toContain('- `toolDescription`: the description of one tool.');
		expect(instructions).toContain('call `check_report` with the report text');
		expect(instructions).not.toContain('## Sandbox workspace');
		expect(agent.hasCheckpointStorage()).toBe(true);
	});

	it('adds the workspace tools when the host supplies a workspace', async () => {
		const context = createContext();
		context.workspace = new Workspace({
			filesystem: mock<WorkspaceFilesystem>({ status: 'ready', basePath: '/workspace' }),
			sandbox: mock<WorkspaceSandbox>({ status: 'running' }),
		});
		const model = modelWithTurns([outputTurn(noChange)]);
		const agent = await createAgentImprovementAgent({
			context,
			modelId: model,
			tools: createHostTools(),
		});
		const { stream } = await agent.stream('Investigate the agent.');
		await stream.pipeTo(new WritableStream());

		const request = model.doStreamCalls[0];
		expect(request.tools?.map((tool) => tool.name).sort()).toEqual(
			[...HOST_TOOL_NAMES, ...WORKSPACE_TOOL_NAMES].sort(),
		);
		expect(JSON.stringify(request.prompt)).toContain('Filesystem access is scoped to `/workspace`');
	});

	it('marks the output of each host tool as untrusted', async () => {
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: new MockLanguageModelV3(),
			tools: createHostTools(),
		});

		expect(agent.declaredTools.map((tool) => tool.name).sort()).toEqual(
			[...HOST_TOOL_NAMES].sort(),
		);
		for (const tool of agent.declaredTools) {
			expect(tool.outputTrust).toBe('untrusted');
		}
	});

	it('gives each callback the parsed input and wraps the result for the model', async () => {
		const host = createHostTools();
		const proposal = {
			edits: [{ kind: 'instructions', after: '  Answer in one paragraph.  ' }],
			evalCases: [
				{ input: 'Where is order 1001?', criteria: 'Gives the status.', expectedTools: [] },
			],
			regressionCaseIds: ['dataset:1'],
		};
		const model = modelWithTurns([
			toolTurn('get_agent_definition', {}),
			toolTurn('list_production_sessions', {}),
			toolTurn('test_proposal', proposal),
			outputTurn({ ...noChange, outcome: 'proposal' }),
		]);
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: model,
			tools: host,
		});
		const { stream } = await agent.stream('Investigate the agent.');
		await stream.pipeTo(new WritableStream());

		expect(model.doStreamCalls).toHaveLength(4);
		expect(host.getAgentDefinition).toHaveBeenCalledTimes(1);
		expect(host.listProductionSessions.mock.calls[0][0]).toEqual({ limit: 20, offset: 0 });
		expect(host.testProposal.mock.calls[0][0]).toEqual({
			edits: [{ kind: 'instructions', after: 'Answer in one paragraph.' }],
			evalCases: [{ ...proposal.evalCases[0], motivating: false }],
			regressionCaseIds: ['dataset:1'],
		});
		const lastPrompt = JSON.stringify(model.doStreamCalls[3].prompt);
		expect(lastPrompt).toContain('untrusted_data source=\\"tool:get_agent_definition\\"');
		expect(lastPrompt).toContain('untrusted_data source=\\"tool:test_proposal\\"');
	});

	it('passes the host abort signal to each callback and stops after an abort', async () => {
		const host = createHostTools();
		const controller = new AbortController();
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: new MockLanguageModelV3(),
			tools: host,
			abortSignal: controller.signal,
		});
		const tool = (name: string) => findTool(agent.declaredTools, name);
		const listInput = { limit: 5, offset: 10 };
		const readInput = { sessionId: 'session' };
		const testInput = {
			edits: [],
			evalCases: [
				{ input: 'Hello', criteria: 'Greets the user.', expectedTools: [], motivating: true },
			],
			regressionCaseIds: [],
		};

		await expect(executeTool(tool('get_agent_definition'), {})).resolves.toEqual({
			goals: ['quality'],
		});
		await expect(executeTool(tool('list_eval_cases'), {})).resolves.toEqual({ cases: [] });
		await expect(executeTool(tool('list_production_sessions'), listInput)).resolves.toEqual({
			total: 0,
			sessions: [],
		});
		await expect(executeTool(tool('read_production_session'), readInput)).resolves.toEqual({
			error: 'Not found',
		});
		await expect(executeTool(tool('test_proposal'), testInput)).resolves.toEqual({
			ok: true,
			cases: [],
		});

		expect(host.getAgentDefinition).toHaveBeenCalledWith(controller.signal);
		expect(host.listEvalCases).toHaveBeenCalledWith(controller.signal);
		expect(host.listProductionSessions).toHaveBeenCalledWith(listInput, controller.signal);
		expect(host.readProductionSession).toHaveBeenCalledWith(readInput, controller.signal);
		expect(host.testProposal).toHaveBeenCalledWith(testInput, controller.signal);

		controller.abort();
		for (const name of HOST_TOOL_NAMES) {
			await expect(executeTool(tool(name), {})).rejects.toThrow();
		}
		expect(host.testProposal).toHaveBeenCalledTimes(1);
	});

	it('uses the signal of the tool call when the host gives no signal', async () => {
		const host = createHostTools();
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: new MockLanguageModelV3(),
			tools: host,
		});
		const signal = new AbortController().signal;

		await executeTool(
			findTool(agent.declaredTools, 'list_eval_cases'),
			{},
			{ abortSignal: signal },
		);

		expect(host.listEvalCases).toHaveBeenCalledWith(signal);
	});

	it('accepts a short Markdown report and rejects an oversized report', async () => {
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: new MockLanguageModelV3(),
			tools: createHostTools(),
		});
		const check = findTool(agent.declaredTools, 'check_report');
		const report = 'The agent could not find orders.\n\nThe change corrects the tool choice.';

		expect(parseToolInput(check, { report }).success).toBe(true);
		await expect(executeTool(check, { report })).resolves.toEqual({ ok: true });
		expect(parseToolInput(check, { report: 'x'.repeat(901) }).success).toBe(false);
		expect(parseToolInput(check, { report: `**What happened**\n\n${report}` }).success).toBe(true);
		expect(parseToolInput(check, { report: `${report}\n\n- One case passed.` }).success).toBe(true);
	});

	it('validates tool input before a callback runs', async () => {
		const agent = await createAgentImprovementAgent({
			context: createContext(),
			modelId: new MockLanguageModelV3(),
			tools: createHostTools(),
		});
		const tool = (name: string) => findTool(agent.declaredTools, name);

		expect(parseToolInput(tool('get_agent_definition'), {}).success).toBe(true);
		expect(parseToolInput(tool('list_production_sessions'), { limit: 51 }).success).toBe(false);
		expect(parseToolInput(tool('read_production_session'), {}).success).toBe(false);
		expect(
			parseToolInput(tool('test_proposal'), { edits: [], evalCases: [], regressionCaseIds: ['a'] })
				.success,
		).toBe(false);
	});

	it('refuses to build without each host callback', async () => {
		const { testProposal: _testProposal, ...incomplete } = createHostTools();

		await expect(
			createAgentImprovementAgent({
				context: createContext(),
				modelId: new MockLanguageModelV3(),
				tools: incomplete as unknown as AgentImprovementHostTools,
			}),
		).rejects.toThrow('Agent improvement requires host tools');
	});

	it('labels the trace with the agent role and the profile version', async () => {
		const run = { id: 'run', metadata: {}, inputs: {} };
		const telemetry = { provider: 'langsmith' };
		const tracing = {
			rootRun: run,
			actorRun: run,
			wrapTools: vi.fn((tools: unknown) => tools),
			getTelemetry: vi.fn().mockReturnValue(telemetry),
		};
		const setTelemetry = vi.spyOn(Agent.prototype, 'telemetry');
		const context = createContext();
		context.tracing = tracing as unknown as InstanceAiContext['tracing'];

		const agent = await createAgentImprovementAgent({
			modelId: new MockLanguageModelV3(),
			context,
			tools: createHostTools(),
		});

		expect(tracing.wrapTools).toHaveBeenCalledWith(expect.anything(), {
			agentRole: 'agent-improvement',
			tags: [AGENT_IMPROVEMENT_PROFILE_VERSION],
		});
		expect(run.metadata).toMatchObject({ prompt_version: 'agent-improvement-v1' });
		expect(tracing.getTelemetry).toHaveBeenCalledWith(
			expect.objectContaining({
				agentRole: 'agent-improvement',
				functionId: 'instance-ai.agent-improvement',
				executionMode: 'background',
			}),
		);
		expect(setTelemetry).toHaveBeenCalledWith(telemetry);
		for (const tool of agent.declaredTools) {
			expect(tool.outputTrust).toBe('untrusted');
		}
	});

	it('sends model calls through the given transport', async () => {
		const setModelFetch = vi.spyOn(Agent.prototype, 'modelFetch');
		const modelFetch = vi.fn();

		await createAgentImprovementAgent({
			modelId: new MockLanguageModelV3(),
			context: createContext(),
			tools: createHostTools(),
			modelFetch,
		});

		expect(setModelFetch).toHaveBeenCalledWith(modelFetch);
	});

	it('names its model calls only when request labels are on', async () => {
		const setFunctionId = vi.spyOn(Agent.prototype, 'functionId');
		const options = {
			modelId: new MockLanguageModelV3(),
			context: createContext(),
			tools: createHostTools(),
		};

		await createAgentImprovementAgent(options);
		expect(setFunctionId).not.toHaveBeenCalled();

		await createAgentImprovementAgent({ ...options, requestLabels: true });
		expect(setFunctionId).toHaveBeenCalledWith('instance-ai.agent-improvement');
	});
});
