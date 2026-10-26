import type { AgentMessageIntegrationOrigin } from '@n8n/api-types';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { AgentMessageOrigin } from '@/modules/agents/entities/agent-message.entity';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';

describe('AgentMessageRepository', () => {
	let repository: AgentMessageRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentMessageRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('updateIntegrationOrigin', () => {
		const slack: AgentMessageIntegrationOrigin = {
			type: 'slack',
			workspaceId: 'T1',
			conversationKind: 'channel',
			channelId: 'C1',
		};

		async function createMessage(origin: AgentMessageOrigin) {
			return await repository.createInput(
				{
					threadId: uuid(),
					resourceId: 'user-1',
					content: { role: 'user', content: [{ type: 'text', text: 'hi' }] },
					origin,
				},
				{},
			);
		}

		it('replaces the platform context and keeps the other origin fields', async () => {
			const message = await createMessage({
				source: 'slack',
				platformThreadId: 'slack:C1:1.2',
				integration: slack,
			});

			await repository.updateIntegrationOrigin(message.id, { ...slack, channelName: 'general' });

			const stored = await repository.findOneByOrFail({ id: message.id });
			expect(stored.origin).toEqual({
				source: 'slack',
				platformThreadId: 'slack:C1:1.2',
				integration: { ...slack, channelName: 'general' },
			});
		});

		it('leaves a message without platform context unchanged', async () => {
			const message = await createMessage({ source: 'chat' });

			await repository.updateIntegrationOrigin(message.id, { ...slack, channelName: 'general' });

			const stored = await repository.findOneByOrFail({ id: message.id });
			expect(stored.origin).toEqual({ source: 'chat' });
		});

		it('ignores a message that no longer exists', async () => {
			await expect(
				repository.updateIntegrationOrigin(uuid(), { ...slack, channelName: 'general' }),
			).resolves.toBeUndefined();
		});
	});
});
