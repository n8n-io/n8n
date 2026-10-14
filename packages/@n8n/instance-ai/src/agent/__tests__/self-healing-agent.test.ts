import {
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
import { loadInstanceAiRuntimeSkillSource } from '../../skills/runtime-skills';
import type { InstanceAiContext, WorkflowDetail } from '../../types';
import type { InstanceAiEventBus } from '../../event-bus';
import { streamAgentRun, type StreamableAgent } from '../../runtime/stream-runner';

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

describe('createSelfHealingAgent', () => {
	it('runs the factory, read tools, verifier, and stream consumer with a deterministic model', async () => {
		const context = createContext();
		vi.mocked(context.executionService.getStatus).mockResolvedValue({
			executionId: 'execution',
			status: 'error',
		});
		const output = {
			outcome: 'fix_ready',
			summary: 'Corrected the field mapping.',
			report: 'The candidate passed verification.',
			candidateFilePath: 'self-healing/candidate.workflow.ts',
		};
		const turns = [
			modelTurn(
				[
					{
						type: 'tool-call',
						toolCallId: 'read',
						toolName: 'executions',
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
			modelTurn([
				{ type: 'text-start', id: 'result' },
				{ type: 'text-delta', id: 'result', delta: JSON.stringify(output) },
				{ type: 'text-end', id: 'result' },
			]),
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
		expect(result.structuredOutput).toEqual(output);
		expect(result.finishReason).toBe('stop');
		expect(context.executionService.getStatus).toHaveBeenCalledWith('execution');
		expect(verifyCandidate).toHaveBeenCalledTimes(1);
		expect(turns).toHaveLength(0);
	});

	it('restricts the final SDK tools and loads the investigation skill before inference', async () => {
		const context = createContext();
		context.workspace = new Workspace({
			filesystem: mock<WorkspaceFilesystem>({ status: 'ready', basePath: '/workspace' }),
			sandbox: mock<WorkspaceSandbox>({ status: 'running' }),
		});
		const agent = await createAgent(context);
		const config = await (
			agent as unknown as {
				build(): Promise<{
					tools: BuiltTool[];
					instructions: string;
					checkpointStorage?: unknown;
					observationalMemory?: unknown;
					skillSource?: unknown;
				}>;
			}
		).build();

		expect(config.tools.map((tool) => tool.name).sort()).toEqual(
			[
				'workflows',
				'executions',
				'data-tables',
				'nodes',
				'n8n-docs',
				'research',
				'verify_candidate',
				'workspace_read_file',
				'workspace_read_tool_result',
				'workspace_write_file',
				'workspace_str_replace_file',
				'workspace_execute_command',
			].sort(),
		);
		expect(config.instructions).toContain('# Self-healing');
		expect(config.instructions).toContain('knowledge-base/reference/workflow-sdk-language.md');
		expect(config.instructions).toContain('Filesystem access is scoped to `/workspace`');
		expect(config.instructions).toContain('execute commands in the workspace');
		expect(config.checkpointStorage).toBe('memory');
		expect(config.observationalMemory).toBeUndefined();
		expect(config.skillSource).toBeUndefined();
		expect(await loadInstanceAiRuntimeSkillSource().loadSkill('self-healing')).toBeNull();
	});

	it.each([
		['workflows', { action: 'publish', workflowId: 'workflow' }],
		['workflows', { action: 'setup', workflowId: 'workflow' }],
		['executions', { action: 'run', workflowId: 'workflow' }],
		['executions', { action: 'run-step', workflowId: 'workflow', nodeName: 'Read' }],
		['executions', { action: 'stop', executionId: 'execution' }],
		['data-tables', { action: 'create', name: 'Table', columns: [] }],
		['data-tables', { action: 'insert-rows', dataTableId: 'table', rows: [{}] }],
		['nodes', { action: 'execute', nodeType: 'n8n-nodes-base.httpRequest' }],
		['nodes', { action: 'explore-resources', nodeType: 'n8n-nodes-base.slack' }],
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
		const tool = findTool((await createAgent(context)).declaredTools, 'executions');
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
		const tool = findTool((await createAgent(context)).declaredTools, 'workflows');
		const result = await executeTool(tool, { action: 'get-as-code', workflowId: 'workflow' });

		expect(result).toMatchObject({
			filePath: 'src/workflows/live-workflow.workflow.ts',
			status: 'written',
		});
		expect(result.note).toContain('verify_candidate');
		expect(result.note).not.toContain('build-workflow');
		expect(JSON.stringify(tool.inputSchema)).not.toContain('build-workflow');
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
		const tool = findTool((await createAgent(context)).declaredTools, 'data-tables');
		await expect(executeTool(tool, { action: 'list' })).resolves.toEqual({ tables: [] });
		await expect(
			executeTool(tool, { action: 'schema', dataTableId: 'table' }),
		).resolves.toMatchObject({ columns: [] });
		await expect(
			executeTool(tool, { action: 'query', dataTableId: 'table', limit: 1 }),
		).resolves.toMatchObject({ count: 1, data: [{ id: 1, status: 'ready' }] });
	});

	it.each(['require_approval', 'blocked'] as const)(
		'returns unavailable for %s research without suspension or a grant',
		async (permission) => {
			const context = createContext();
			context.permissions = {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				webSearch: permission,
				fetchUrl: permission,
			};
			const tool = findTool((await createAgent(context)).declaredTools, 'research');
			const suspend = vi.fn();
			const toolContext = { suspend, resumeData: { approved: true } };
			await expect(
				executeTool(tool, { action: 'web-search', query: 'API docs' }, toolContext),
			).resolves.toMatchObject({ unavailable: true });
			await expect(
				executeTool(tool, { action: 'fetch-url', url: 'https://example.com' }, toolContext),
			).resolves.toMatchObject({ unavailable: true });
			expect(suspend).not.toHaveBeenCalled();
			expect(context.webResearchService?.search).not.toHaveBeenCalled();
			expect(context.webResearchService?.fetchUrl).not.toHaveBeenCalled();
		},
	);

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
		const tool = findTool((await createAgent(context)).declaredTools, 'research');
		await expect(
			executeTool(tool, { action: 'web-search', query: 'API docs' }),
		).resolves.toMatchObject({ results: [] });
		await expect(
			executeTool(tool, { action: 'fetch-url', url: 'https://example.com' }),
		).resolves.toMatchObject({ title: 'Docs' });
	});

	it('passes only candidate input and the host abort signal to the verifier', async () => {
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
		const input = { filePath: 'self-healing/candidate.workflow.ts', validationOnly: true };
		expect(parseToolInput(tool, { ...input, workflowId: 'other' }).success).toBe(false);
		await expect(executeTool(tool, input)).resolves.toEqual({ valid: true });
		expect(verifyCandidate).toHaveBeenCalledWith(input, controller.signal);
		controller.abort();
		await expect(executeTool(tool, input)).rejects.toThrow();
		expect(verifyCandidate).toHaveBeenCalledTimes(1);
	});
});
