import { randomUUID } from 'node:crypto';

import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';

import { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

describe('InstanceAiMessageRepository', () => {
	let messageRepository: InstanceAiMessageRepository;
	let threadRepository: InstanceAiThreadRepository;
	let project: Project;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		messageRepository = Container.get(InstanceAiMessageRepository);
		threadRepository = Container.get(InstanceAiThreadRepository);
		project = await createTeamProject();
	});

	beforeEach(async () => {
		await messageRepository.delete({});
		await threadRepository.delete({});
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				resourceId: 'user-1',
				projectId: project.id,
				title: '',
				metadata: null,
			}),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveMessage(role: string) {
		await messageRepository.save(
			messageRepository.create({
				id: randomUUID(),
				threadId,
				content: 'hello',
				role,
				type: null,
				resourceId: 'user-1',
			}),
		);
	}

	describe('hasAnyUserMessage', () => {
		it('is false on an instance with no messages', async () => {
			await expect(messageRepository.hasAnyUserMessage()).resolves.toBe(false);
		});

		it('is true once a user message exists', async () => {
			await saveMessage('user');

			await expect(messageRepository.hasAnyUserMessage()).resolves.toBe(true);
		});

		it.each(['assistant', 'tool', 'system'])(
			'is false when only %s messages exist',
			async (role) => {
				await saveMessage(role);

				await expect(messageRepository.hasAnyUserMessage()).resolves.toBe(false);
			},
		);

		it('is true when a user message sits among other roles', async () => {
			await saveMessage('assistant');
			await saveMessage('user');
			await saveMessage('tool');

			await expect(messageRepository.hasAnyUserMessage()).resolves.toBe(true);
		});
	});
});
