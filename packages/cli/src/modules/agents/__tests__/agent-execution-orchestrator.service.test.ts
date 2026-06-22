import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { JSONSchema7 } from 'json-schema';
import { OperationalError, UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		name: 'Support Agent',
		projectId,
		schema,
		activeVersionId: 'published-version',
		activeVersion: { schema, tools: {}, skills: {}, publishedById: userId },
		tools: {},
		skills: {},
		...overrides,
	} as unknown as Agent;
}

function makeReadableStream(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
	return new ReadableStream<StreamChunk>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function makeRuntime(chunks: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }]) {
	return {
		agent: {
			name: 'Runtime Agent',
			stream: jest.fn().mockResolvedValue({ stream: makeReadableStream(chunks) }),
			resume: jest.fn().mockResolvedValue({ stream: makeReadableStream(chunks) }),
			structuredOutput: jest.fn(),
			close: jest.fn(),
		} as unknown as RuntimeAgent & {
			stream: jest.Mock;
			resume: jest.Mock;
			structuredOutput: jest.Mock;
		},
		toolRegistry: mock<ToolRegistry>(),
		projectId,
		agentId,
	};
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const telemetry = mock<Telemetry>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const credentialsService = mock<CredentialsService>();

	executionService.recordMessage.mockResolvedValue('execution-1');

	const service = new AgentExecutionOrchestratorService(
		mockLogger(),
		agentRepository,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
		credentialsService,
	);

	return {
		service,
		agentRepository,
		checkpointStorage,
		executionService,
		telemetry,
		runtimeCacheService,
	};
}

async function collect(generator: AsyncGenerator<StreamChunk>) {
	const chunks: StreamChunk[] = [];
	for await (const chunk of generator) chunks.push(chunk);
	return chunks;
}

describe('AgentExecutionOrchestratorService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('streams chat responses and records suspended executions', async () => {
		const { service, executionService } = makeService();
		const runtime = makeRuntime([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: 'Choose one' },
			{ type: 'tool-call-suspended', toolCallId: 'tc-1', toolName: 'ask_question', runId: 'run-1' },
		]);

		const chunks = await collect(
			service.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
			}),
		);

		expect(chunks.at(-1)?.type).toBe('tool-call-suspended');
		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
				executionCounter: expect.any(Object),
			}),
		);
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				userMessage: 'hello',
				hitlStatus: 'suspended',
				record: expect.objectContaining({ assistantResponse: 'Choose one' }),
			}),
		);
	});

	it('adds the max-iterations assistant text before the finish chunk', async () => {
		const { service } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'max-iterations' }]);

		const chunks = await collect(
			service.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'resource-1' },
				projectId,
			}),
		);

		const generatedTextIndex = chunks.findIndex(
			(chunk) =>
				chunk.type === 'text-delta' && chunk.delta.includes('maximum number of iterations'),
		);
		const finishIndex = chunks.findIndex((chunk) => chunk.type === 'finish');

		expect(generatedTextIndex).toBeGreaterThan(-1);
		expect(generatedTextIndex).toBeLessThan(finishIndex);
	});

	it('maps persisted execution history to chat DTOs', async () => {
		const { service, executionService } = makeService();
		executionService.getThreadDetail.mockResolvedValue({
			thread: { id: 'thread-1' },
			executions: [{ id: 'execution-1', userMessage: 'Hi', assistantResponse: 'Hello' }],
		} as never);

		await expect(
			service.getConversationHistory({ threadId: 'thread-1', projectId, agentId }),
		).resolves.toEqual([
			{ id: 'execution-1:user', role: 'user', content: [{ type: 'text', text: 'Hi' }] },
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hello' }],
			},
		]);
	});

	it('rejects expired checkpoints and resumes active checkpoints without passing resourceId', async () => {
		const { service, checkpointStorage, runtimeCacheService, executionService } = makeService();
		const runtime = makeRuntime([{ type: 'finish', finishReason: 'stop' }]);

		checkpointStorage.getStatus.mockResolvedValueOnce({ status: 'expired' });
		await expect(
			collect(
				service.resumeForChat({
					agentId,
					projectId,
					runId: 'expired-run',
					toolCallId: 'tc-1',
					resumeData: { value: 'yes' },
				}),
			),
		).rejects.toThrow(UserError);

		checkpointStorage.getStatus.mockResolvedValueOnce({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
		} as never);
		runtimeCacheService.getRuntime.mockResolvedValue(runtime);

		await collect(
			service.resumeForChat({
				agentId,
				projectId,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { value: 'yes' },
				integrationType: 'slack',
			}),
		);

		expect(runtime.agent.resume).toHaveBeenCalledWith(
			'stream',
			{ value: 'yes' },
			expect.objectContaining({ runId: 'run-1', toolCallId: 'tc-1' }),
		);
		expect(JSON.stringify(runtime.agent.resume.mock.calls[0])).not.toContain('platform-user-1');
		expect(executionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: 'thread-1', userMessage: '', hitlStatus: 'resumed' }),
		);
	});

	it('executes workflow runs with execution-scoped persistence and tool-call output', async () => {
		const { service, agentRepository, runtimeCacheService, telemetry } = makeService();
		const runtime = makeRuntime([
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: { id: 1 } },
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'lookup', output: { ok: true } },
			{ type: 'finish', finishReason: 'stop', structuredOutput: { answer: 'done' } },
		]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		runtimeCacheService.getPublishedAgent.mockImplementation((agent) => agent);
		runtimeCacheService.reconstructFromConfig.mockResolvedValue(runtime);

		const result = await service.executeForWorkflow(
			agentId,
			'hello',
			'execution-1',
			'thread-1',
			userId,
			projectId,
			userId,
		);

		expect(runtime.agent.stream).toHaveBeenCalledWith(
			'hello',
			expect.objectContaining({
				persistence: { resourceId: 'execution-1', threadId: 'thread-1' },
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({
				response: '',
				structuredOutput: { answer: 'done' },
				toolCalls: [{ toolName: 'lookup', input: { id: 1 }, result: { ok: true } }],
			}),
		);

		const streamOptions = runtime.agent.stream.mock.calls[0][1] as {
			executionCounter: { incrementMessageCount: () => void };
		};
		streamOptions.executionCounter.incrementMessageCount();
		expect(telemetry.trackAgentExecution).toHaveBeenCalledWith({
			agent_id: agentId,
			user_id: userId,
			message_count: 1,
		});
	});

	it('applies per-call structured output schema and improves empty-output errors', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const outputSchema: JSONSchema7 = {
			type: 'object',
			properties: { answer: { type: 'string' } },
		};
		const runtime = makeRuntime([{ type: 'error', error: new Error('No output generated.') }]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		runtimeCacheService.getPublishedAgent.mockImplementation((agent) => agent);
		runtimeCacheService.reconstructFromConfig.mockResolvedValue(runtime);

		await expect(
			service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				userId,
				false,
				outputSchema,
			),
		).rejects.toThrow(OperationalError);
		expect(runtime.agent.structuredOutput).toHaveBeenCalledWith(outputSchema);
	});
});
