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

	describe('hasAtLeastUserMessages', () => {
		it('is false on an instance with no messages', async () => {
			await expect(messageRepository.hasAtLeastUserMessages(1)).resolves.toBe(false);
		});

		it('is true once the threshold is met exactly', async () => {
			await saveMessage('user');
			await saveMessage('user');
			await saveMessage('user');

			await expect(messageRepository.hasAtLeastUserMessages(3)).resolves.toBe(true);
		});

		it('is false while short of the threshold', async () => {
			await saveMessage('user');
			await saveMessage('user');

			await expect(messageRepository.hasAtLeastUserMessages(3)).resolves.toBe(false);
		});

		it('is true beyond the threshold', async () => {
			for (let i = 0; i < 5; i++) await saveMessage('user');

			await expect(messageRepository.hasAtLeastUserMessages(3)).resolves.toBe(true);
		});

		it.each(['assistant', 'tool', 'system'])('does not count %s messages', async (role) => {
			await saveMessage(role);
			await saveMessage(role);
			await saveMessage(role);
			await saveMessage('user');

			await expect(messageRepository.hasAtLeastUserMessages(3)).resolves.toBe(false);
			await expect(messageRepository.hasAtLeastUserMessages(1)).resolves.toBe(true);
		});

		it('counts user messages sitting among other roles', async () => {
			await saveMessage('assistant');
			await saveMessage('user');
			await saveMessage('tool');
			await saveMessage('user');

			await expect(messageRepository.hasAtLeastUserMessages(2)).resolves.toBe(true);
			await expect(messageRepository.hasAtLeastUserMessages(3)).resolves.toBe(false);
		});

		// Guards the caller against a misconfigured threshold silently disabling the gate.
		it('treats a non-positive threshold as already met', async () => {
			await expect(messageRepository.hasAtLeastUserMessages(0)).resolves.toBe(true);
		});
	});
});
