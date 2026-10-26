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
						toolName: DOMAIN_TOOL_IDS.EXECUTIONS,
						input: JSON.stringify({ action: 'get', executionId: 'execution' }),
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
				DOMAIN_TOOL_IDS.WORKFLOWS,
				DOMAIN_TOOL_IDS.EXECUTIONS,
				DOMAIN_TOOL_IDS.DATA_TABLES,
				DOMAIN_TOOL_IDS.NODES,
				DOMAIN_TOOL_IDS.N8N_DOCS,
				DOMAIN_TOOL_IDS.RESEARCH,
				'verify_candidate',
				'workspace_read_file',
				'workspace_read_tool_result',
				'workspace_write_file',
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

	it.each([
		[DOMAIN_TOOL_IDS.WORKFLOWS, { action: 'publish', workflowId: 'workflow' }],
		[DOMAIN_TOOL_IDS.WORKFLOWS, { action: 'setup', workflowId: 'workflow' }],
		[DOMAIN_TOOL_IDS.EXECUTIONS, { action: 'run', workflowId: 'workflow' }],
		[DOMAIN_TOOL_IDS.EXECUTIONS, { action: 'run-step', workflowId: 'workflow', nodeName: 'Read' }],
		[DOMAIN_TOOL_IDS.EXECUTIONS, { action: 'stop', executionId: 'execution' }],
		[DOMAIN_TOOL_IDS.DATA_TABLES, { action: 'create', name: 'Table', columns: [] }],
		[DOMAIN_TOOL_IDS.DATA_TABLES, { action: 'insert-rows', dataTableId: 'table', rows: [{}] }],
		[DOMAIN_TOOL_IDS.NODES, { action: 'execute', nodeType: 'n8n-nodes-base.httpRequest' }],
		[DOMAIN_TOOL_IDS.NODES, { action: 'explore-resources', nodeType: 'n8n-nodes-base.slack' }],
	])('rejects unavailable %s actions in the schema', async (name, input) => {
		const agent = await createAgent();
		const tool = findTool(agent.declaredTools, name);
		expect(parseToolInput(tool, input).success).toBe(false);
	});

	it('keeps execution reads and adapter access checks', async () => {
		const context = createContext();
		vi.mocked(context.executionService.getStatus).mockResolvedValue({
			executionId: 'execution',
			status: 'error',
		});
		const tool = findTool((await createAgent(context)).declaredTools, DOMAIN_TOOL_IDS.EXECUTIONS);
		await expect(
			executeTool(tool, { action: 'get', executionId: 'execution' }),
		).resolves.toMatchObject({ status: 'error' });
		vi.mocked(context.executionService.getStatus).mockRejectedValue(new Error('Access denied'));
		await expect(executeTool(tool, { action: 'get', executionId: 'other' })).rejects.toThrow(
			'Access denied',
		);
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
		const tool = findTool((await createAgent(context)).declaredTools, DOMAIN_TOOL_IDS.WORKFLOWS);
		const result = await executeTool(tool, { action: 'get-as-code', workflowId: 'workflow' });

		expect(result).toMatchObject({
			filePath: 'src/workflows/live-workflow.workflow.ts',
			status: 'written',
		});
		expect(result.note).toContain('verify_candidate');
		expect(result.note).not.toContain(DOMAIN_TOOL_IDS.BUILD_WORKFLOW);
		expect(JSON.stringify(tool.inputSchema)).not.toContain(DOMAIN_TOOL_IDS.BUILD_WORKFLOW);
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
		const tool = findTool((await createAgent(context)).declaredTools, DOMAIN_TOOL_IDS.DATA_TABLES);
		await expect(executeTool(tool, { action: 'list' })).resolves.toEqual({ tables: [] });
		await expect(
			executeTool(tool, { action: 'schema', dataTableId: 'table' }),
		).resolves.toMatchObject({ columns: [] });
		await expect(
			executeTool(tool, { action: 'query', dataTableId: 'table', limit: 1 }),
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
