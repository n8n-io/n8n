import {
	Agent,
	Workspace,
	type BuiltTool,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';

import { createSelfHealingAgent } from '../self-healing-agent';
import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import type { SelfHealingCandidateVerifier } from '../../self-healing';
import { loadInstanceAiSkills } from '../../skills/skills';
import type { InstanceAiContext, WorkflowDetail } from '../../types';
import type { InstanceAiEventBus } from '../../event-bus';
import { streamAgentRun, type StreamableAgent } from '../../runtime/stream-runner';
import { DOMAIN_TOOL_IDS } from '../../tools/tool-ids';

function createContext(): InstanceAiContext {
	return {
		userId: 'actor',
		workflowService: mock<InstanceAiContext['workflowService']>(),
		executionService: mock<InstanceAiContext['executionService']>(),
		credentialService: mock<InstanceAiContext['credentialService']>(),
		nodeService: mock<InstanceAiContext['nodeService']>(),
		dataTableService: mock<InstanceAiContext['dataTableService']>(),
		workflowTemplateService: mock<InstanceAiContext['workflowTemplateService']>(),
		webResearchService: mock<NonNullable<InstanceAiContext['webResearchService']>>(),
		logger: mock<InstanceAiContext['logger']>(),
		permissions: {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			runWorkflow: 'always_allow',
			publishWorkflow: 'always_allow',
			createDataTable: 'always_allow',
			mutateDataTableRows: 'always_allow',
		},
	};
}

async function createAgent(
	context = createContext(),
	verifyCandidate = vi.fn<SelfHealingCandidateVerifier>(),
) {
	return await createSelfHealingAgent({
		modelId: new MockLanguageModelV3(),
		context,
		verifyCandidate,
	});
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

function outputTurn(output: Record<string, unknown>): MockStreamResult {
	return modelTurn([
		{ type: 'text-start', id: 'result' },
		{ type: 'text-delta', id: 'result', delta: JSON.stringify(output) },
		{ type: 'text-end', id: 'result' },
	]);
}

describe('createSelfHealingAgent', () => {
	it('runs the factory, read tools, verifier, and stream consumer with a deterministic model', async () => {
		// Keep model pricing requests offline.
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
		const context = createContext();
		vi.mocked(context.executionService.getStatus).mockResolvedValue({
			executionId: 'execution',
			status: 'error',
		});
		const output = {
			outcome: 'fix_ready',
			summary: 'Correct the field mapping'.repeat(4),
			report:
				'**What happened**\n\nThe node used the wrong field.\n\n' +
				'**What changed**\n\nThe proposed mapping passed verification. Nothing has been applied.',
			candidateFilePath: 'self-healing/candidate.workflow.ts',
		};
		const turns = [
			modelTurn(
				[
					{
						type: 'tool-call',
						toolCallId: 'read',
						toolName: DOMAIN_TOOL_IDS.GET_EXECUTION,
						input: JSON.stringify({ executionId: 'execution' }),
					},
				],
				true,
			),
			modelTurn(
				[
					{
						type: 'tool-call',
						toolCallId: 'verify',
						toolName: 'verify_candidate',
						input: JSON.stringify({ filePath: output.candidateFilePath }),
					},
				],
				true,
			),
			outputTurn(output),
		];
		const model = new MockLanguageModelV3({
			doStream: async () => {
				const turn = turns.shift();
				if (!turn) throw new Error('Unexpected model call');
				return turn;
			},
		});
		const verifyCandidate = vi
			.fn<SelfHealingCandidateVerifier>()
			.mockResolvedValue({ valid: true });
		const agent = await createSelfHealingAgent({ context, modelId: model, verifyCandidate });
		const eventBus = mock<InstanceAiEventBus>();
		const signal = new AbortController().signal;
		const result = await streamAgentRun(
			agent as unknown as StreamableAgent,
			'Investigate the supplied failure.',
			{
				maxIterations: 5,
				abortSignal: signal,
				recoverUsageOnAbort: true,
				persistence: { threadId: 'internal-thread', resourceId: 'ia-self-healing:actor' },
			},
			{
				threadId: 'internal-thread',
				runId: 'run',
				agentId: 'self-healing',
				signal,
				eventBus,
				logger: context.logger,
			},
		);

		expect(result.status).toBe('completed');
		expect(result.structuredOutput).toEqual({ ...output, summary: output.summary.slice(0, 80) });
		expect(result.finishReason).toBe('stop');
		expect(context.executionService.getStatus).toHaveBeenCalledWith('execution');
		expect(verifyCandidate).toHaveBeenCalledTimes(1);
		expect(turns).toHaveLength(0);

		const persistence = { threadId: 'internal-thread', resourceId: 'ia-self-healing:actor' };
		turns.push(outputTurn(output));
		const continued = await agent.stream('Continue the investigation.', { persistence });
		await continued.stream.pipeTo(new WritableStream());
		expect(JSON.stringify(model.doStreamCalls.at(-1)?.prompt)).toContain(output.summary);

		const nextAgent = await createSelfHealingAgent({ context, modelId: model, verifyCandidate });
		turns.push(outputTurn(output));
		const fresh = await nextAgent.stream('Investigate another failure.', { persistence });
		await fresh.stream.pipeTo(new WritableStream());
		expect(model.doStreamCalls).toHaveLength(5);
		expect(JSON.stringify(model.doStreamCalls.at(-1)?.prompt)).not.toContain(output.summary);
	});

	it('sends model calls through the given transport', async () => {
		const setModelFetch = vi.spyOn(Agent.prototype, 'modelFetch');
		const modelFetch = vi.fn();

		await createSelfHealingAgent({
			modelId: new MockLanguageModelV3(),
			context: createContext(),
			verifyCandidate: vi.fn(),
			modelFetch,
		});

		expect(setModelFetch).toHaveBeenCalledWith(modelFetch);
		setModelFetch.mockRestore();
	});

	it('names its model calls only when request labels are on', async () => {
		const setFunctionId = vi.spyOn(Agent.prototype, 'functionId');
		const options = {
			modelId: new MockLanguageModelV3(),
			context: createContext(),
			verifyCandidate: vi.fn(),
		};

		await createSelfHealingAgent(options);
		expect(setFunctionId).not.toHaveBeenCalled();

		await createSelfHealingAgent({ ...options, requestLabels: true });
		expect(setFunctionId).toHaveBeenCalledWith('instance-ai.self-healing');
		setFunctionId.mockRestore();
	});

	it('restricts the final SDK tools and includes the investigation prompt', async () => {
		const context = createContext();
		context.workspace = new Workspace({
			filesystem: mock<WorkspaceFilesystem>({ status: 'ready', basePath: '/workspace' }),
			sandbox: mock<WorkspaceSandbox>({ status: 'running' }),
		});
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
		const model = new MockLanguageModelV3({
			doStream: async () =>
				outputTurn({
					outcome: 'could_not_fix',
					summary: 'No fix found',
					report: 'No changes were made.',
					candidateFilePath: null,
				}),
		});
		const agent = await createSelfHealingAgent({
			context,
			modelId: model,
			verifyCandidate: vi.fn<SelfHealingCandidateVerifier>(),
		});
		const { stream } = await agent.stream('Investigate the failed execution.');
		await stream.pipeTo(new WritableStream());
		expect(model.doStreamCalls).toHaveLength(1);
		const request = model.doStreamCalls[0];
		expect(request.responseFormat).toMatchObject({
			type: 'json',
			schema: {
				required: ['outcome', 'summary', 'report', 'candidateFilePath'],
				properties: {
					candidateFilePath: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
				},
			},
		});
		const instructions = request.prompt
			.filter((message) => message.role === 'system')
			.map((message) => message.content)
			.join('\n');

		expect(request.tools?.map((tool) => tool.name).sort()).toEqual(
			[
				DOMAIN_TOOL_IDS.GET_WORKFLOW,
				DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE,
				DOMAIN_TOOL_IDS.LIST_EXECUTIONS,
				DOMAIN_TOOL_IDS.GET_EXECUTION,
				DOMAIN_TOOL_IDS.DEBUG_EXECUTION,
				DOMAIN_TOOL_IDS.GET_EXECUTION_NODE_OUTPUT,
				DOMAIN_TOOL_IDS.GET_RESOLVED_NODE_PARAMETERS,
				DOMAIN_TOOL_IDS.LIST_DATA_TABLES,
				DOMAIN_TOOL_IDS.GET_DATA_TABLE_SCHEMA,
				DOMAIN_TOOL_IDS.QUERY_DATA_TABLE,
				DOMAIN_TOOL_IDS.SEARCH_NODES,
				DOMAIN_TOOL_IDS.GET_NODE_TYPES,
				DOMAIN_TOOL_IDS.N8N_DOCS,
				DOMAIN_TOOL_IDS.RESEARCH,
				'verify_candidate',
				'workspace_read_file',
				'workspace_read_files',
				'workspace_read_tool_result',
				'workspace_write_file',
				'workspace_edit_files',
				'workspace_str_replace_file',
				'workspace_execute_command',
			].sort(),
		);
		expect(instructions).toContain('# Self-healing');
		expect(instructions).toContain('knowledge-base/reference/workflow-sdk-language.md');
		expect(instructions).toContain('Filesystem access is scoped to `/workspace`');
		expect(instructions).toContain('execute commands in the workspace');
		expect(agent.hasCheckpointStorage()).toBe(true);
		expect(agent.snapshot.hasObservationalMemory).toBe(false);
		expect(await loadInstanceAiSkills().loadSkill('self-healing')).toBeNull();
	});

	it('does not declare workflow tools that change a workflow', async () => {
		const names = (await createAgent()).declaredTools.map((tool) => tool.name);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.RUN_WORKFLOW);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.RUN_WORKFLOW_STEP);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.STOP_EXECUTION);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.CREATE_DATA_TABLE);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.INSERT_DATA_TABLE_ROWS);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.PUBLISH_WORKFLOW);
		expect(names).not.toContain(DOMAIN_TOOL_IDS.SETUP_WORKFLOW);
	});

	it('keeps execution reads and adapter access checks', async () => {
		const context = createContext();
		vi.mocked(context.executionService.getStatus).mockResolvedValue({
			executionId: 'execution',
			status: 'error',
		});
		const tool = findTool(
			(await createAgent(context)).declaredTools,
			DOMAIN_TOOL_IDS.GET_EXECUTION,
		);
		await expect(executeTool(tool, { executionId: 'execution' })).resolves.toMatchObject({
			status: 'error',
		});
		vi.mocked(context.executionService.getStatus).mockRejectedValue(new Error('Access denied'));
		await expect(executeTool(tool, { executionId: 'other' })).rejects.toThrow('Access denied');
	});

	it('keeps the candidate unchanged when a live workflow is read as source', async () => {
		const context = createContext();
		const candidatePath = 'self-healing/candidate.workflow.ts';
		const files = new Map([[candidatePath, 'edited candidate']]);
		const filesystem = mock<WorkspaceFilesystem>({ status: 'ready', basePath: '/workspace' });
		filesystem.readFile.mockImplementation(async (path) => {
			const content = files.get(path);
			if (content === undefined) throw new Error('File not found');
			return content;
		});
		filesystem.writeFile.mockImplementation(async (path, content) => {
			files.set(path, typeof content === 'string' ? content : content.toString());
		});
		context.workspace = new Workspace({ filesystem });
		vi.mocked(context.workflowService.get).mockResolvedValue(
			mock<WorkflowDetail>({
				id: 'workflow',
				name: 'Live workflow',
				versionId: 'current',
				checksum: 'current',
			}),
		);
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			id: 'workflow',
			name: 'Live workflow',
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
		});
		const tool = findTool(
			(await createAgent(context)).declaredTools,
			DOMAIN_TOOL_IDS.GET_WORKFLOW_AS_CODE,
		);
		const result = await executeTool(tool, { workflowId: 'workflow' });

		expect(result).toMatchObject({
			filePath: 'src/workflows/live-workflow.workflow.ts',
			status: 'written',
		});
		expect(result.note).toContain('verify_candidate');
		expect(result.note).not.toContain(DOMAIN_TOOL_IDS.BUILD_WORKFLOW);
		expect(tool.description).toContain('verify_candidate');
		expect(tool.description).not.toContain(DOMAIN_TOOL_IDS.BUILD_WORKFLOW);
		expect(files.get(candidatePath)).toBe('edited candidate');
	});

	it('permits data table reads through the existing service', async () => {
		const context = createContext();
		vi.mocked(context.dataTableService.list).mockResolvedValue([]);
		vi.mocked(context.dataTableService.getSchema).mockResolvedValue([]);
		vi.mocked(context.dataTableService.queryRows).mockResolvedValue({
			count: 1,
			data: [{ id: 1, status: 'ready' }],
		});
		const tools = (await createAgent(context)).declaredTools;
		const tool = (name: string) => findTool(tools, name);
		await expect(executeTool(tool(DOMAIN_TOOL_IDS.LIST_DATA_TABLES), {})).resolves.toEqual({
			tables: [],
		});
		await expect(
			executeTool(tool(DOMAIN_TOOL_IDS.GET_DATA_TABLE_SCHEMA), { dataTableId: 'table' }),
		).resolves.toMatchObject({ columns: [] });
		await expect(
			executeTool(tool(DOMAIN_TOOL_IDS.QUERY_DATA_TABLE), { dataTableId: 'table', limit: 1 }),
		).resolves.toMatchObject({ count: 1, data: [{ id: 1, status: 'ready' }] });
	});

	it('runs research when policy permits it', async () => {
		const context = createContext();
		context.permissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			webSearch: 'always_allow',
			fetchUrl: 'always_allow',
		};
		vi.mocked(context.webResearchService!.search!).mockResolvedValue({
			query: 'API docs',
			results: [],
		});
		vi.mocked(context.webResearchService!.fetchUrl).mockResolvedValue({
			url: 'https://example.com',
			finalUrl: 'https://example.com',
			title: 'Docs',
			content: 'Reference',
			contentLength: 9,
			truncated: false,
		});
		const tool = findTool((await createAgent(context)).declaredTools, DOMAIN_TOOL_IDS.RESEARCH);
		const suspend = vi.fn();
		const toolContext = { suspend };
		await expect(
			executeTool(tool, { action: 'web-search', query: 'API docs' }, toolContext),
		).resolves.toMatchObject({ results: [] });
		await expect(
			executeTool(tool, { action: 'fetch-url', url: 'https://example.com' }, toolContext),
		).resolves.toMatchObject({ title: 'Docs' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it.each([{}, { triggerNodeName: 'Incoming Order', inputData: { body: { price: '12' } } }])(
		'passes candidate input and the host abort signal to the verifier (%#)',
		async (options) => {
			const verifyCandidate = vi
				.fn<SelfHealingCandidateVerifier>()
				.mockResolvedValue({ valid: true });
			const controller = new AbortController();
			const agent = await createSelfHealingAgent({
				context: createContext(),
				modelId: new MockLanguageModelV3(),
				verifyCandidate,
				abortSignal: controller.signal,
			});
			const tool = findTool(agent.declaredTools, 'verify_candidate');
			const input = {
				filePath: 'self-healing/candidate.workflow.ts',
				validationOnly: true,
				...options,
			};
			expect(parseToolInput(tool, input).success).toBe(true);
			expect(parseToolInput(tool, { ...input, triggerNodeName: '' }).success).toBe(false);
			expect(parseToolInput(tool, { ...input, workflowId: 'other' }).success).toBe(false);
			await expect(executeTool(tool, input)).resolves.toEqual({ valid: true });
			expect(verifyCandidate).toHaveBeenCalledWith(input, controller.signal);
			controller.abort();
			await expect(executeTool(tool, input)).rejects.toThrow();
			expect(verifyCandidate).toHaveBeenCalledTimes(1);
		},
	);
});
