import { Agent as RuntimeAgent, Tool } from '@n8n/agents';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import { AgentMessageQueueConsumer } from '@/modules/agents/agent-message-queue-consumer.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnOutcome,
} from '@/modules/agents/system-agents/system-agent.types';

import { createOwner } from '../shared/db/users';

type ModelStreamPart = Awaited<
	ReturnType<MockLanguageModelV3['doStream']>
>['stream'] extends ReadableStream<infer Part>
	? Part
	: never;

const AGENT_ID = 'test-system-agent';
const usage = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 },
};

/** The first model call asks for the `wait` tool. The next call answers. */
function scriptedModel() {
	let calls = 0;
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'system-turn',
		doStream: async () => {
			const first = calls++ === 0;
			return {
				stream: convertArrayToReadableStream<ModelStreamPart>([
					{ type: 'stream-start', warnings: [] },
					...(first
						? [{ type: 'tool-call' as const, toolCallId: 'wait-1', toolName: 'wait', input: '{}' }]
						: [
								{ type: 'text-start' as const, id: 'answer' },
								{ type: 'text-delta' as const, id: 'answer', delta: 'Done' },
								{ type: 'text-end' as const, id: 'answer' },
							]),
					{
						type: 'finish',
						finishReason: { unified: first ? 'tool-calls' : 'stop', raw: undefined },
						usage,
					},
				]),
			};
		},
	});
}

async function until(check: () => boolean, timeoutMs = 10_000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > timeoutMs) throw new Error('Timed out');
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

interface TurnProbe {
	/** Make `prepareTurn` wait for its signal, like a slow sandbox setup. */
	slowSetup?: boolean;
	setupStarted?: boolean;
	setupEnd?: 'aborted' | 'timeout';
	turnSignal?: AbortSignal;
	providerAbort?: AbortController;
	toolStarted?: boolean;
	toolEnd?: 'aborted' | 'timeout';
	outcome?: SystemAgentTurnOutcome;
}

describe('System agent turn abort', () => {
	let probe: TurnProbe;
	let service: SystemAgentExecutionService;
	let owner: User;
	let projectId: string;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Test System Agent',
		authorize: async () => true,
		async prepareTurn(turn: SystemAgentTurn) {
			probe.turnSignal = turn.abortSignal;
			if (probe.slowSetup) {
				probe.setupStarted = true;
				probe.setupEnd = await new Promise((resolve) => {
					const timer = setTimeout(() => resolve('timeout'), 5_000);
					turn.abortSignal.addEventListener('abort', () => {
						clearTimeout(timer);
						resolve('aborted');
					});
				});
				turn.abortSignal.throwIfAborted();
			}
			probe.providerAbort = new AbortController();
			// The tool waits for the run signal, so the turn stays active until it aborts.
			const wait = new Tool('wait')
				.description('Wait')
				.input(z.object({}))
				.handler(async (_input, ctx) => {
					probe.toolStarted = true;
					probe.toolEnd = await new Promise((resolve) => {
						const timer = setTimeout(() => resolve('timeout'), 5_000);
						ctx.abortSignal?.addEventListener('abort', () => {
							clearTimeout(timer);
							resolve('aborted');
						});
					});
					return 'waited';
				});
			const agent = new RuntimeAgent('Test System Agent')
				.instructions('Use the wait tool.')
				.model(scriptedModel())
				.tool(wait)
				.memory(Container.get(N8nMemory).getImplementation(AGENT_ID))
				.checkpoint(Container.get(N8NCheckpointStorage).getStorage(AGENT_ID));
			return {
				agent,
				runOptions: { abortSignal: probe.providerAbort.signal },
				onSettled: async (outcome) => {
					probe.outcome = outcome;
				},
			};
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(SystemAgentExecutionService);
		await Container.get(SystemAgentRegistrationService).register(provider);
		Container.get(AgentMessageQueueConsumer).start();
		owner = await createOwner();
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id))
			.id;
	});

	afterAll(async () => {
		Container.get(AgentMessageQueueConsumer).stop();
		await testDb.terminate();
	});

	beforeEach(() => {
		probe = {};
	});

	async function queueTurn() {
		const thread = await service.createThread({ agentId: AGENT_ID, user: owner, projectId });
		await service.sendMessage({
			agentId: AGENT_ID,
			user: owner,
			threadId: thread.id,
			message: 'Go',
		});
		return thread;
	}

	/** Queue a message and wait until the turn runs the `wait` tool. */
	async function startTurn() {
		const thread = await queueTurn();
		await until(() => probe.toolStarted === true);
		return thread;
	}

	async function latestStatus(threadId: string) {
		return (await Container.get(AgentExecutionRepository).findLatestByThreadId(threadId))?.status;
	}

	it('aborts the turn signal of the provider when the user cancels the turn', async () => {
		const thread = await startTurn();
		expect(probe.turnSignal?.aborted).toBe(false);

		expect(await service.cancel(AGENT_ID, owner, thread.id)).toBe(true);
		await until(() => probe.outcome !== undefined);

		expect(probe.turnSignal?.aborted).toBe(true);
		expect(probe.toolEnd).toBe('aborted');
		expect(probe.outcome?.status).toBe('cancelled');
		// The provider settles before the runtime stores the turn record.
		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('cancelled'));
	});

	it('stops an admitted turn when the provider aborts its run signal', async () => {
		const thread = await startTurn();

		probe.providerAbort?.abort();
		await until(() => probe.outcome !== undefined);

		expect(probe.toolEnd).toBe('aborted');
		expect(probe.turnSignal?.aborted).toBe(true);
		expect(probe.outcome?.status).toBe('cancelled');
		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('cancelled'));
	});

	it('stops provider setup when the user cancels before the turn runs', async () => {
		probe.slowSetup = true;
		const thread = await queueTurn();
		await until(() => probe.setupStarted === true);

		expect(await service.cancel(AGENT_ID, owner, thread.id)).toBe(true);
		await until(() => probe.setupEnd !== undefined);

		expect(probe.setupEnd).toBe('aborted');
		expect(probe.toolStarted).toBeUndefined();
		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('cancelled'));
	});
});
