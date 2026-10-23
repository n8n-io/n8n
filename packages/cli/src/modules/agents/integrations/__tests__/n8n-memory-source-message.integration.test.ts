import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentMessageRepository } from '../../repositories/agent-message.repository';
import { AgentRepository } from '../../repositories/agent.repository';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';

describe('N8nMemoryImpl memory source messages', () => {
	const scope = { resourceId: 'user-1', threadId: 'thread-1' };
	let messages: AgentMessageRepository;
	let memory: N8nMemoryImpl;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		messages = Container.get(AgentMessageRepository);
		const project = await createTeamProject();
		const agentRepository = Container.get(AgentRepository);
		const agent = await agentRepository.save(
			agentRepository.create({ name: 'Memory agent', projectId: project.id, integrations: [] }),
		);
		memory = Container.get(N8nMemory).getImplementation(agent.id);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createMessage(id: string, name: string) {
		return await messages.createInput(
			{
				id,
				...scope,
				content: { role: 'user', content: [{ type: 'text', text: name }] },
				author: { id: `U_${name}`, name },
				origin: {
					source: 'slack',
					integration: {
						type: 'slack',
						workspaceId: 'T1',
						conversationKind: 'channel',
						channelId: `C_${name}`,
					},
				},
			},
			{},
		);
	}

	async function captureFrom(sourceMessageId: string | null, content: string) {
		const candidate = await memory.episodic.enqueueCaptureCandidate({
			...scope,
			sourceMessageId,
			runId: crypto.randomUUID(),
			toolCallId: 'call-1',
			content,
			evidenceText: content,
			kind: 'preference',
		});
		const entry = await memory.episodic.saveEntryWithSources(
			{ resourceId: scope.resourceId, content, embedding: [1, 0], embeddingModel: 'test-model' },
			[{ candidateId: candidate.id, threadId: scope.threadId, evidenceText: content }],
		);
		if (!entry) throw new Error('Expected an episodic entry');
		return entry;
	}

	it('resolves author and origin from the quoted message, not the latest one', async () => {
		await createMessage('message-earlier', 'Alice');
		await createMessage('message-later', 'Bob');
		const entry = await captureFrom('message-earlier', 'Alice prefers short reports.');

		const sources = await memory.getEntrySourcesWithMessageContext([entry.id]);

		expect(sources).toHaveLength(1);
		expect(sources[0]).toMatchObject({
			author: { id: 'U_Alice', name: 'Alice' },
			origin: { source: 'slack', integration: { channelId: 'C_Alice' } },
		});
	});

	it('returns no origin when the candidate has no message', async () => {
		const entry = await captureFrom(null, 'The team ships on Fridays.');

		const sources = await memory.getEntrySourcesWithMessageContext([entry.id]);

		expect(sources).toHaveLength(1);
		expect(sources[0]).not.toHaveProperty('origin');
		expect(sources[0]).not.toHaveProperty('author');
	});

	it('returns no origin after the quoted message is deleted', async () => {
		await createMessage('message-deleted', 'Carol');
		const entry = await captureFrom('message-deleted', 'Carol uses dark mode.');
		await messages.delete({ id: 'message-deleted' });

		const sources = await memory.getEntrySourcesWithMessageContext([entry.id]);

		expect(sources).toHaveLength(1);
		expect(sources[0]).not.toHaveProperty('origin');
	});
});
