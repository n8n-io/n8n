import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { createUser } from '@test-integration/db/users';

import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { parseStoredMessages } from '../../message-parser';
import { createConfiguration } from '../../self-healing/__tests__/support/configuration';
import { SelfHealingResultRepository } from '../../self-healing/database/self-healing-result.repository';
import { SelfHealingChatService } from '../../self-healing/self-healing-chat.service';
import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

vi.mock('../../instance-ai-settings.service', () => ({ InstanceAiSettingsService: vi.fn() }));

describe('Self-healing private chat persistence', () => {
	let threads: InstanceAiThreadRepository;
	let messages: InstanceAiMessageRepository;
	let results: SelfHealingResultRepository;
	let txRunner: TransactionRunner;
	let memory: TypeORMAgentMemory;
	let service: SelfHealingChatService;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		threads = Container.get(InstanceAiThreadRepository);
		messages = Container.get(InstanceAiMessageRepository);
		results = Container.get(SelfHealingResultRepository);
		txRunner = Container.get(TransactionRunner);
		memory = Container.get(TypeORMAgentMemory);
		service = new SelfHealingChatService(threads, mock<InstanceAiSettingsService>());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function fixture() {
		const user = await createUser();
		const project = await threads.getPersonalProjectForChat(user.id, {});
		const workflow = await createWorkflow({}, user);
		const configuration = await createConfiguration(project.id, user.id);
		const result = await results.createResult(
			{
				configurationId: configuration.id,
				workflowId: workflow.id,
				projectId: project.id,
				backgroundUserId: user.id,
				outcome: 'needs_you',
				summary: 'Review the request settings.',
				report: 'Connect the account, then retry the workflow.',
				completedAt: new Date(),
				executionId: 'saved-execution',
				suggestionId: null,
				usage: {
					credits: null,
					turns: null,
					durationSeconds: null,
				},
			},
			{},
		);
		const prepare = async () =>
			await txRunner.run({}, async (ctx) => await service.prepare(user, result, ctx));
		return { user, project, workflow, result, prepare };
	}

	it('saves a report and workflow attachment that the normal chat history can read', async () => {
		const { user, project, workflow, result } = await fixture();
		const threadId = await txRunner.run(
			{},
			async (ctx) =>
				await service.prepare(user, result, ctx, { status: 'available', id: result.executionId }),
		);

		expect(await threads.findOneByOrFail({ id: threadId })).toMatchObject({
			resourceId: user.id,
			projectId: project.id,
			title: result.summary,
			metadata: {
				source: 'self_healing_result',
				origin: 'internal',
				sourceContext: { resultId: result.id, outcome: result.outcome },
			},
		});
		expect(parseStoredMessages(await memory.getMessages(threadId))).toEqual([
			expect.objectContaining({
				role: 'user',
				content: `Saved investigation report\n\n${result.report}`,
				attachments: [{ type: 'workflow', id: workflow.id, executionId: result.executionId }],
			}),
		]);
	});

	it('omits an unavailable execution reference', async () => {
		const { workflow, prepare } = await fixture();
		const threadId = await prepare();
		expect(await messages.countBy({ threadId })).toBe(1);
		expect(parseStoredMessages(await memory.getMessages(threadId))[0]?.attachments).toEqual([
			{ type: 'workflow', id: workflow.id },
		]);
	});

	it('rolls back the thread and its report with the enclosing continuation transaction', async () => {
		const { user, result } = await fixture();
		let preparedId: string | undefined;
		await expect(
			txRunner.run({}, async (ctx) => {
				preparedId = await service.prepare(user, result, ctx);
				throw new Error('The workflow could not be saved.');
			}),
		).rejects.toThrow('The workflow could not be saved.');
		expect(preparedId).toBeDefined();
		expect(await threads.countBy({ id: preparedId })).toBe(0);
		expect(await messages.countBy({ threadId: preparedId })).toBe(0);
	});

	it('keeps the private conversation after the result is deleted', async () => {
		const { result, prepare } = await fixture();
		const threadId = await prepare();
		await results.delete(result.id);
		expect(await threads.findOneBy({ id: threadId })).not.toBeNull();
		expect(parseStoredMessages(await memory.getMessages(threadId))).toHaveLength(1);
	});
});
