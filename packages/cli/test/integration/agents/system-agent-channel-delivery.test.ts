import { Agent as RuntimeAgent } from '@n8n/agents';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import { AgentMessageQueueConsumer } from '@/modules/agents/agent-message-queue-consumer.service';
import type { AgentChatBridge } from '@/modules/agents/integrations/agent-chat-bridge';
import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
} from '@/modules/agents/system-agents/system-agent.types';
import type { AgentExecutionStreamChunk } from '@/modules/agents/types/agent-steering';
import type { SystemChannelDelivery } from '@/modules/agents/types/agent-queued-message';

import { createMember, createOwner } from '../shared/db/users';

type ModelStreamPart = Awaited<
	ReturnType<MockLanguageModelV3['doStream']>
>['stream'] extends ReadableStream<infer Part>
	? Part
	: never;

const AGENT_ID = 'test-system-agent';
const CREDENTIAL_ID = 'fake-credential-id';
const usage = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function answeringModel(text: string) {
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'system-turn',
		doStream: async () => ({
			stream: convertArrayToReadableStream<ModelStreamPart>([
				{ type: 'stream-start', warnings: [] },
				{ type: 'text-start', id: 'answer' },
				{ type: 'text-delta', id: 'answer', delta: text },
				{ type: 'text-end', id: 'answer' },
				{ type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
			]),
		}),
	});
}

async function until(check: () => boolean, timeoutMs = 10_000) {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > timeoutMs) throw new Error('Timed out');
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
}

const channel: SystemChannelDelivery = {
	type: 'slack',
	credentialId: CREDENTIAL_ID,
	platformThreadId: 'slack:C1:1700000000.000100',
	actingExternalUserId: 'U1',
	tenantId: 'T1',
};

describe('A system turn that a chat message started', () => {
	let service: SystemAgentExecutionService;
	let owner: User;
	let ownerProjectId: string;
	let turnUserIds: string[];
	let deliveries: Array<{ channel: SystemChannelDelivery; threadId: string }>;
	let sunkChunks: AgentExecutionStreamChunk[];
	let acquire: ReturnType<typeof vi.spyOn>;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Test System Agent',
		authorize: async () => true,
		async prepareTurn(turn: SystemAgentTurn) {
			turnUserIds.push(turn.user.id);
			const agent = new RuntimeAgent('Test System Agent')
				.instructions('Answer.')
				.model(answeringModel('You have 3 workflows.'))
				.memory(Container.get(N8nMemory).getImplementation(AGENT_ID))
				.checkpoint(Container.get(N8NCheckpointStorage).getStorage(AGENT_ID));
			return { agent };
		},
	};

	/** A bridge that records what the consumer delivers, in place of a live Slack connection. */
	const fakeBridge = {
		async deliverSystemTurn(
			delivery: SystemChannelDelivery,
			threadId: string,
			run: (onChunk: (chunk: AgentExecutionStreamChunk) => void) => Promise<void>,
		) {
			deliveries.push({ channel: delivery, threadId });
			await run((chunk) => sunkChunks.push(chunk));
		},
	} as unknown as AgentChatBridge;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(SystemAgentExecutionService);
		await Container.get(SystemAgentRegistrationService).register(provider);
		Container.get(AgentMessageQueueConsumer).start();
		owner = await createOwner();
		ownerProjectId = (
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id)
		).id;
	});

	afterAll(async () => {
		Container.get(AgentMessageQueueConsumer).stop();
		await testDb.terminate();
	});

	beforeEach(async () => {
		turnUserIds = [];
		deliveries = [];
		sunkChunks = [];
		await Container.get(AgentRepository).updateInstanceAgentIntegrations(AGENT_ID, [
			{
				type: 'slack',
				credentialId: CREDENTIAL_ID,
				settings: { messagingExperience: 'assistant', teamId: 'T1' },
			},
		]);
		acquire = vi
			.spyOn(Container.get(ChatIntegrationService), 'acquireQueueBridge')
			.mockReturnValue({ bridge: fakeBridge, release: vi.fn() });
	});

	afterEach(() => {
		acquire.mockRestore();
	});

	async function latestStatus(threadId: string) {
		return (await Container.get(AgentExecutionRepository).findLatestByThreadId(threadId))?.status;
	}

	async function queueTurn(user: User, projectId: string, withChannel = true) {
		const thread = await service.createThread({ agentId: AGENT_ID, user, projectId });
		await service.sendMessage({
			agentId: AGENT_ID,
			user,
			threadId: thread.id,
			message: 'How many workflows do I have?',
			...(withChannel ? { channel } : {}),
		});
		return thread;
	}

	it('runs as its owner and sends every chunk to the delivery sink', async () => {
		const thread = await queueTurn(owner, ownerProjectId);

		await until(() => sunkChunks.some((chunk) => chunk.type === 'finish'));
		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('success'));

		expect(turnUserIds).toEqual([owner.id]);
		expect(acquire).toHaveBeenCalledWith(AGENT_ID, 'slack', CREDENTIAL_ID);
		expect(deliveries).toEqual([{ channel, threadId: thread.id }]);
		const text = sunkChunks.flatMap((chunk) => (chunk.type === 'text-delta' ? [chunk.delta] : []));
		expect(text.join('')).toBe('You have 3 workflows.');
	});

	it('runs as the member who owns the thread, not as another user', async () => {
		const member = await createMember();
		const memberProjectId = (
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(member.id)
		).id;

		const thread = await queueTurn(member, memberProjectId);

		await until(() => sunkChunks.some((chunk) => chunk.type === 'finish'));
		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('success'));
		expect(turnUserIds).toEqual([member.id]);
		expect(turnUserIds).not.toContain(owner.id);
	});

	it('runs a turn without a chat delivery as before', async () => {
		const thread = await queueTurn(owner, ownerProjectId, false);

		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('success'));
		expect(deliveries).toEqual([]);
		expect(acquire).not.toHaveBeenCalled();
	});

	it('still runs and records the turn when the connection is gone', async () => {
		await Container.get(AgentRepository).updateInstanceAgentIntegrations(AGENT_ID, []);

		const thread = await queueTurn(owner, ownerProjectId);

		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('success'));
		expect(turnUserIds).toEqual([owner.id]);
		expect(deliveries).toEqual([]);
	});

	it('still runs and records the turn when this main has no live bridge', async () => {
		acquire.mockReturnValue(undefined);

		const thread = await queueTurn(owner, ownerProjectId);

		await vi.waitFor(async () => expect(await latestStatus(thread.id)).toBe('success'));
		expect(turnUserIds).toEqual([owner.id]);
		expect(deliveries).toEqual([]);
	});
});
