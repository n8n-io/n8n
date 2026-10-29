import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentResourceRepository } from '@/modules/agents/repositories/agent-resource.repository';

describe('AgentResourceRepository', () => {
	let resources: AgentResourceRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		resources = Container.get(AgentResourceRepository);
	});

	afterEach(async () => {
		await resources.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('saves the chat session generation and keeps the other metadata keys', async () => {
		await resources.save(
			resources.create({ id: 'agent-1:thread-1', metadata: JSON.stringify({ other: 'kept' }) }),
		);

		await resources.saveChatSessionGeneration('agent-1:thread-1', {
			generation: 1,
			lastActivityAt: 1,
		});
		await resources.saveChatSessionGeneration('agent-1:thread-1', {
			generation: 2,
			lastActivityAt: 2,
		});
		await resources.saveChatSessionGeneration('agent-1:thread-2', {
			generation: 1,
			lastActivityAt: 3,
		});

		await expect(resources.findChatSessionGeneration('agent-1:thread-1')).resolves.toEqual({
			generation: 2,
			lastActivityAt: 2,
		});
		await expect(resources.findChatSessionGeneration('agent-1:thread-2')).resolves.toEqual({
			generation: 1,
			lastActivityAt: 3,
		});
		const resource = await resources.findOneByOrFail({ id: 'agent-1:thread-1' });
		expect(JSON.parse(resource.metadata ?? '{}')).toMatchObject({ other: 'kept' });
	});
});
