import type {
	BuiltAgent,
	CredentialProvider,
	StreamChunk,
	StreamResult,
	ToolDescriptor,
} from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import { buildFromJson, type ToolExecutor } from '../../json-config/from-json-config';
import {
	createSubAgentThreadId,
	renderSubAgentPrompt,
	SubAgentForegroundRunner,
} from '../sub-agent-foreground-runner';
import type {
	ResolvedSubAgentRuntimeSource,
	SubAgentSourceResolver,
} from '../sub-agent-source-resolver';

jest.mock('../../json-config/from-json-config', () => ({
	buildFromJson: jest.fn(),
}));

const projectId = 'project-1';
const parentRunId = 'parent-run-1';
const parentThreadId = 'parent-thread-1';
const parentAgentId = 'parent-agent-1';

const runnableConfig: RunnableAgentJsonConfig = {
	name: 'Helper Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Help with delegated work.',
};

const source: ResolvedSubAgentSource = {
	type: 'inline',
	config: runnableConfig,
};

const toolDescriptor: ToolDescriptor = {
	name: 'lookup_customer',
	description: 'Look up a customer',
	systemInstruction: null,
	inputSchema: {
		type: 'object',
		properties: {},
	},
	outputSchema: null,
	hasSuspend: false,
	hasResume: false,
	hasToMessage: false,
	requireApproval: false,
	providerOptions: null,
};

const runtimeSource: ResolvedSubAgentRuntimeSource = {
	source,
	toolDescriptors: {
		tool_1: toolDescriptor,
	},
	toolCodeByName: {
		lookup_customer: 'return input;',
	},
	skills: {
		skill_1: {
			name: 'Skill 1',
			description: 'Helps with tests',
			instructions: 'Skill body',
		},
	},
};

const spawnRequest: SubAgentSpawnRequest = {
	taskName: 'Research API',
	goal: 'Find the relevant API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A concise summary.',
	source: {
		type: 'inline',
		config: runnableConfig,
	},
	contextMode: 'fresh',
	executionMode: 'foreground',
	parentRunId,
	parentThreadId,
	parentTaskPath: '/root',
};

const defaultStreamChunks: StreamChunk[] = [
	{ type: 'text-delta', id: 'text-1', delta: 'Child answer' },
	{
		type: 'finish',
		finishReason: 'stop',
		model: 'anthropic/claude-sonnet-4-5',
		usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
	},
];

describe('SubAgentForegroundRunner', () => {
	let sourceResolver: jest.Mocked<SubAgentSourceResolver>;
	let runner: SubAgentForegroundRunner;
	let childAgent: jest.Mocked<BuiltAgent>;
	let agentExecutionService: jest.Mocked<AgentExecutionService>;
	let logger: jest.Mocked<Logger>;
	let credentialProvider: jest.Mocked<CredentialProvider>;
	let toolExecutor: jest.Mocked<ToolExecutor>;
	let createToolExecutor: jest.Mock;
	let createMemoryFactory: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		sourceResolver = mock<SubAgentSourceResolver>();
		sourceResolver.resolveForRuntime.mockResolvedValue(runtimeSource);
		agentExecutionService = mock<AgentExecutionService>();
		logger = mock<Logger>();
		runner = new SubAgentForegroundRunner(sourceResolver, agentExecutionService, logger);

		childAgent = mock<BuiltAgent>();
		childAgent.stream.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		jest.mocked(buildFromJson).mockResolvedValue(childAgent as never);

		credentialProvider = mock<CredentialProvider>();
		toolExecutor = mock<ToolExecutor>();
		createToolExecutor = jest.fn().mockReturnValue(toolExecutor);
		createMemoryFactory = jest.fn().mockReturnValue(jest.fn());
	});

	it('builds an isolated child agent and runs it with a fresh prompt', async () => {
		const result = await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
		});

		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			source,
			status: 'completed',
			result: expect.objectContaining({
				runId: 'child-run-1',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
			}),
		});
		expect(createToolExecutor).toHaveBeenCalledWith(runtimeSource.toolCodeByName);
		expect(buildFromJson).toHaveBeenCalledWith(
			runnableConfig,
			runtimeSource.toolDescriptors,
			expect.objectContaining({
				toolExecutor,
				credentialProvider,
				skills: runtimeSource.skills,
				memoryFactory: expect.any(Function),
			}),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			[
				'Goal:\nFind the relevant API behavior.',
				'Context:\nFocus on auth endpoints.',
				'Expected output:\nA concise summary.',
			].join('\n\n'),
			expect.objectContaining({
				persistence: {
					// Inline sub-agents have no source id, so the thread falls back to
					// the task path; the resource scope falls back to the project.
					resourceId: 'project-1',
					threadId: 'subagent:parent-thread-1:/root/research_api_0',
				},
			}),
		);
		expect(agentExecutionService.recordMessage).not.toHaveBeenCalled();
	});

	it('inherits the parent resource id as the child memory scope when provided', async () => {
		await runner.runForeground(
			{ ...spawnRequest, parentResourceId: 'draft-chat:user-1' },
			{
				projectId,
				credentialProvider,
				createToolExecutor,
				createMemoryFactory,
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: 'draft-chat:user-1',
					threadId: 'subagent:parent-thread-1:/root/research_api_0',
				},
			}),
		);
	});

	it('uses the saved n8n agent id as memory owner while keeping a subagent thread scope', async () => {
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: {
				type: 'n8n-agent',
				sourceId: 'agent-2',
				versionId: 'version-1',
				config: {
					...runnableConfig,
					memory: { enabled: true, storage: 'n8n' },
				},
			},
		});
		jest.mocked(buildFromJson).mockImplementation(async (_config, _toolDescriptors, options) => {
			await options.memoryFactory({ enabled: true, storage: 'n8n' });
			return childAgent as never;
		});

		await runner.runForeground(
			{
				...spawnRequest,
				source: { type: 'n8n-agent', agentId: 'agent-2', versionId: 'version-1' },
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
				createToolExecutor,
				createMemoryFactory,
			},
		);

		expect(createMemoryFactory).toHaveBeenCalledWith('agent-2');
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: 'project-1',
					threadId: 'subagent:parent-thread-1:agent-2',
				},
			}),
		);
		expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				// Same id as the SDK memory thread above, so title sync + deletion line up.
				threadId: 'subagent:parent-thread-1:agent-2',
				agentId: 'agent-2',
				agentName: 'Helper Agent',
				projectId,
				source: 'subagent',
				threadMetadata: {
					origin: 'subagent',
					parentThreadId,
					parentAgentId,
				},
			}),
		);
	});

	it('marks the run as failed when the child result contains an error', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'error', error: new Error('failed') },
				{ type: 'finish', finishReason: 'error' },
			]),
		);

		await expect(
			runner.runForeground(spawnRequest, {
				projectId,
				credentialProvider,
				createToolExecutor,
				createMemoryFactory,
			}),
		).resolves.toMatchObject({
			status: 'failed',
		});
	});

	it('rejects child creation when maxDepth would be exceeded', async () => {
		await expect(
			runner.runForeground(
				{
					...spawnRequest,
					parentTaskPath: '/root/parent',
					policy: { maxDepth: 1 },
				},
				{
					projectId,
					credentialProvider,
					createToolExecutor,
					createMemoryFactory,
				},
			),
		).rejects.toThrow('Sub-agent task path depth 2 exceeds maxDepth 1');
		expect(sourceResolver.resolveForRuntime).not.toHaveBeenCalled();
	});

	it('rejects child creation when maxChildren would be exceeded', async () => {
		await expect(
			runner.runForeground(
				{
					...spawnRequest,
					policy: { maxChildren: 1 },
				},
				{
					projectId,
					childCount: 1,
					credentialProvider,
					createToolExecutor,
					createMemoryFactory,
				},
			),
		).rejects.toThrow('Sub-agent child count 2 exceeds maxChildren 1');
		expect(sourceResolver.resolveForRuntime).not.toHaveBeenCalled();
	});

	it('rejects non-fresh context modes for now', async () => {
		await expect(
			runner.runForeground(
				{
					...spawnRequest,
					contextMode: 'selected-summary',
				},
				{
					projectId,
					credentialProvider,
					createToolExecutor,
					createMemoryFactory,
				},
			),
		).rejects.toThrow('Foreground sub-agent runner only supports fresh context mode');
	});

	it('passes an abort signal when timeout policy is configured', async () => {
		await runner.runForeground(
			{
				...spawnRequest,
				policy: { timeoutMs: 1000 },
			},
			{
				projectId,
				credentialProvider,
				createToolExecutor,
				createMemoryFactory,
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				abortSignal: expect.any(AbortSignal),
			}),
		);
	});

	it('aborts the child run when the parent run is cancelled', async () => {
		const parentAbort = new AbortController();
		childAgent.stream.mockImplementation(
			async (_input, options) =>
				await new Promise<StreamResult>((resolve) => {
					const settle = () =>
						resolve(
							makeStreamResult([
								{ type: 'error', error: new Error('aborted') },
								{ type: 'finish', finishReason: 'error' },
							]),
						);
					if (options?.abortSignal?.aborted) settle();
					else options?.abortSignal?.addEventListener('abort', settle, { once: true });
				}),
		);

		const run = runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			createToolExecutor,
			createMemoryFactory,
			abortSignal: parentAbort.signal,
		});

		parentAbort.abort();

		await expect(run).resolves.toMatchObject({ status: 'failed' });
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
	});

	it('returns failed status when timeout aborts the child run', async () => {
		jest.useFakeTimers();
		childAgent.stream.mockImplementation(
			async (_input, options) =>
				await new Promise<StreamResult>((resolve) => {
					options?.abortSignal?.addEventListener('abort', () => {
						resolve(
							makeStreamResult([
								{ type: 'error', error: new Error('aborted') },
								{ type: 'finish', finishReason: 'error' },
							]),
						);
					});
				}),
		);

		try {
			const run = runner.runForeground(
				{
					...spawnRequest,
					policy: { timeoutMs: 1000 },
				},
				{
					projectId,
					credentialProvider,
					createToolExecutor,
					createMemoryFactory,
				},
			);

			await jest.advanceTimersByTimeAsync(1000);

			await expect(run).resolves.toMatchObject({
				status: 'failed',
			});
		} finally {
			jest.useRealTimers();
		}
	});
});

describe('renderSubAgentPrompt', () => {
	it('renders only provided sections', () => {
		expect(
			renderSubAgentPrompt({
				taskName: 'Summarize',
				goal: 'Summarize the thread.',
				source: spawnRequest.source,
			}),
		).toBe('Goal:\nSummarize the thread.');
	});
});

describe('createSubAgentThreadId', () => {
	it('keys the thread by the parent conversation and the sub-agent source', () => {
		expect(createSubAgentThreadId('test-agent-1:user-1', 'agent-2', '/root/research_api_0')).toBe(
			'subagent:test-agent-1:user-1:agent-2',
		);
	});

	it('falls back to the task path when the parent thread or source id is missing', () => {
		expect(createSubAgentThreadId(undefined, undefined, '/root/research_api_0')).toBe(
			'subagent:/root/research_api_0:/root/research_api_0',
		);
	});
});

function makeStreamResult(chunks: StreamChunk[]): StreamResult {
	return {
		runId: 'child-run-1',
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}
				controller.close();
			},
		}),
	};
}
