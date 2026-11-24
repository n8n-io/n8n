import { EXTENDED_PROMPT_MAX_LENGTH } from '@n8n/api-types';
import { testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const AGENT_ID = 'test-system-agent';
const atLimit = 'a'.repeat(EXTENDED_PROMPT_MAX_LENGTH);
const overLimit = 'a'.repeat(EXTENDED_PROMPT_MAX_LENGTH + 1);
const tooLong = { message: `Message must be ${EXTENDED_PROMPT_MAX_LENGTH} characters or fewer` };

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

let owner: User;

beforeAll(async () => {
	owner = await createOwner();
});

afterEach(() => vi.restoreAllMocks());

describe('System agent chat message limit', () => {
	describe('POST /agents/system/:agentId/chat', () => {
		const send = async (message: string) =>
			await server
				.authAgentFor(owner)
				.post(`/agents/system/${AGENT_ID}/chat`)
				.query({ projectId: randomUUID() })
				.send({ message });

		it('accepts a message at the limit', async () => {
			const prepare = vi
				.spyOn(Container.get(SystemAgentExecutionService), 'prepareChatMessage')
				.mockResolvedValue({ payload: {} } as Awaited<
					ReturnType<SystemAgentExecutionService['prepareChatMessage']>
				>);
			// A duplicate ends the relay normally, without a run.
			const enqueue = vi
				.spyOn(Container.get(AgentMessageQueueService), 'enqueue')
				.mockResolvedValue({ status: 'duplicate' });

			const response = await send(atLimit);

			expect(response.status).toBe(200);
			expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ message: atLimit }));
			expect(enqueue).toHaveBeenCalled();
		});

		it('rejects a message over the limit before it prepares a run', async () => {
			const prepare = vi.spyOn(Container.get(SystemAgentExecutionService), 'prepareChatMessage');

			const response = await send(overLimit);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject(tooLong);
			expect(prepare).not.toHaveBeenCalled();
		});
	});

	describe('PATCH /agents/system/:agentId/chat/:threadId/queue/:queueId', () => {
		const threadId = randomUUID();
		const update = async (message: string) =>
			await server
				.authAgentFor(owner)
				.patch(`/agents/system/${AGENT_ID}/chat/${threadId}/queue/1`)
				.send({ message });

		const spyOnQueue = () => {
			vi.spyOn(Container.get(SystemAgentExecutionService), 'getUsableThread').mockResolvedValue({
				id: threadId,
				projectId: randomUUID(),
			} as AgentExecutionThread);
			return vi
				.spyOn(Container.get(AgentMessageQueueService), 'updatePending')
				.mockResolvedValue(undefined);
		};

		it('accepts a message at the limit', async () => {
			const updatePending = spyOnQueue();

			const response = await update(atLimit);

			expect(response.status).toBe(200);
			expect(updatePending).toHaveBeenCalledWith(expect.objectContaining({ message: atLimit }));
		});

		it('rejects a message over the limit before it updates the queue', async () => {
			const updatePending = spyOnQueue();

			const response = await update(overLimit);

			expect(response.status).toBe(400);
			expect(response.body).toMatchObject(tooLong);
			expect(updatePending).not.toHaveBeenCalled();
		});
	});
});
