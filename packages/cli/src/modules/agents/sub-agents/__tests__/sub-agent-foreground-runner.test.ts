import {
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	type BuiltAgent,
	type CredentialProvider,
	type StreamChunk,
	type StreamResult,
} from '@n8n/agents';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import { AgentRuntimeReconstructionService } from '../../agent-runtime-reconstruction.service';
import { SubAgentForegroundRunner } from '../sub-agent-foreground-runner';
import type {
	ResolvedSubAgentRuntimeSource,
	SubAgentSourceResolver,
} from '../sub-agent-source-resolver';

const projectId = 'project-1';
const parentThreadId = 'parent-thread-1';
const parentAgentId = 'parent-agent-1';

const runnableConfig: RunnableAgentJsonConfig = {
	name: 'Helper Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'credential-1',
	instructions: 'Help with delegated work.',
};

const source: ResolvedSubAgentSource = {
	sourceId: 'agent-1',
	config: runnableConfig,
};

const runtimeSource: ResolvedSubAgentRuntimeSource = {
	source,
	toolDescriptors: {
		tool_1: {
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
		},
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
	goal: 'Find the relevant API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A concise summary.',
	source: {
		agentId: 'agent-1',
	},
	executionMode: 'foreground',
	parentThreadId,
	taskPath: '/root/research_api_0',
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
	let sourceResolver: Mocked<SubAgentSourceResolver>;
	let reconstructionService: Mocked<AgentRuntimeReconstructionService>;
	let runner: SubAgentForegroundRunner;
	let childAgent: Mocked<BuiltAgent>;
	let agentExecutionService: Mocked<AgentExecutionService>;
	let logger: Mocked<Logger>;
	let credentialProvider: Mocked<CredentialProvider>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
		sourceResolver = mock<SubAgentSourceResolver>();
		sourceResolver.resolveForRuntime.mockResolvedValue(runtimeSource);
		reconstructionService = mock<AgentRuntimeReconstructionService>();
		Container.set(AgentRuntimeReconstructionService, reconstructionService);
		agentExecutionService = mock<AgentExecutionService>();
		logger = mock<Logger>();
		runner = new SubAgentForegroundRunner(sourceResolver, agentExecutionService, logger);

		childAgent = mock<BuiltAgent>();
		childAgent.stream.mockResolvedValue(makeStreamResult(defaultStreamChunks));
		childAgent.close.mockResolvedValue(undefined);
		reconstructionService.reconstructFromResolvedSource.mockResolvedValue({
			agent: childAgent as never,
			toolRegistry: new Map(),
		});

		credentialProvider = mock<CredentialProvider>();
	});

	it('resolves reconstruction from the container at run time', async () => {
		await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledTimes(1);
	});

	it('rebuilds the child through the shared reconstruction service and runs it with a fresh prompt', async () => {
		const result = await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
		});

		expect(result).toMatchObject({
			taskPath: '/root/research_api_0',
			threadId: expect.any(String),
			status: 'completed',
			result: expect.objectContaining({
				runId: 'child-run-1',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
			}),
		});
		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith({
			config: runnableConfig,
			memoryOwnerAgentId: 'agent-1',
			projectId,
			credentialProvider,
			toolDescriptors: runtimeSource.toolDescriptors,
			toolCodeByName: runtimeSource.toolCodeByName,
			skills: runtimeSource.skills,
			runtimeProfile: 'sub-agent',
			parentAgentIdForDelegation: undefined,
			user: undefined,
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.stringContaining('YOUR TASK:\nFind the relevant API behavior.'),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
				},
			}),
		);
		const childPrompt = childAgent.stream.mock.calls[0]?.[0] as string;
		expect(childPrompt).toContain('CONTEXT:\nFocus on auth endpoints.');
		expect(childPrompt).toContain('EXPECTED OUTPUT:\nA concise summary.');
		expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-1',
				source: 'subagent',
				telemetry: {
					runType: 'production',
					configuration: expect.objectContaining({
						model: 'anthropic/claude-sonnet-4-5',
					}),
				},
			}),
		);
	});

	it('filters sub-agent tools by the delegating user access when the parent run has a user', async () => {
		const user = mock<User>({ id: 'user-1' });

		await runner.runForeground(spawnRequest, {
			projectId,
			credentialProvider,
			user,
		});

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({ user }),
		);
	});

	it('inherits the parent resource id as the child memory scope when provided', async () => {
		const result = await runner.runForeground(
			{ ...spawnRequest, parentResourceId: 'draft-chat:user-1' },
			{
				projectId,
				credentialProvider,
			},
		);

		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: 'draft-chat:user-1',
					threadId: result.threadId,
				},
			}),
		);
		expect(result.threadId).toEqual(expect.any(String));
	});

	it('uses the saved n8n agent id as memory owner and records parent linkage', async () => {
		sourceResolver.resolveForRuntime.mockResolvedValue({
			...runtimeSource,
			source: {
				sourceId: 'agent-2',
				versionId: 'version-1',
				config: {
					...runnableConfig,
					memory: { enabled: true, storage: 'n8n' },
				},
			},
		});

		const result = await runner.runForeground(
			{
				...spawnRequest,
				source: { agentId: 'agent-2', versionId: 'version-1' },
			},
			{
				projectId,
				parentAgentId,
				credentialProvider,
			},
		);

		expect(reconstructionService.reconstructFromResolvedSource).toHaveBeenCalledWith(
			expect.objectContaining({
				memoryOwnerAgentId: 'agent-2',
				runtimeProfile: 'sub-agent',
				parentAgentIdForDelegation: parentAgentId,
			}),
		);
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				persistence: {
					resourceId: result.threadId,
					threadId: result.threadId,
				},
			}),
		);
		expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: result.threadId,
				agentId: 'agent-2',
				agentName: 'Helper Agent',
				projectId,
				source: 'subagent',
				threadMetadata: {
					parentThreadId,
					parentAgentId,
				},
			}),
		);
	});

	it('marks the run as failed when the child stream emits a suspension', async () => {
		childAgent.stream.mockResolvedValue(
			makeStreamResult([
				{ type: 'text-delta', id: 'text-1', delta: 'Choose an option' },
				{
					type: 'tool-call-suspended',
					runId: 'child-run-1',
					toolCallId: 'tool-call-1',
					toolName: 'approval_action',
				},
				{ type: 'finish', finishReason: 'tool-calls' },
			]),
		);

		await expect(
			runner.runForeground(spawnRequest, {
				projectId,
				credentialProvider,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			result: {
				runId: 'child-run-1',
				finishReason: 'error',
				error: DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
			},
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
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
			}),
		).resolves.toMatchObject({
			status: 'failed',
		});
		expect(childAgent.close).toHaveBeenCalledTimes(1);
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
			abortSignal: parentAbort.signal,
		});

		parentAbort.abort();

		await expect(run).resolves.toMatchObject({ status: 'failed' });
		expect(childAgent.stream).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
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
		getState: () => {
			throw new Error('not implemented');
		},
	};
}
