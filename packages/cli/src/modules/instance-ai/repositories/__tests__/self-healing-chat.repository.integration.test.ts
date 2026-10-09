import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { createUser } from '@test-integration/db/users';

import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import type { InstanceAiService } from '../../instance-ai.service';
import { AUTO_FOLLOW_UP_MESSAGE } from '../../internal-messages';
import { parseStoredMessages } from '../../message-parser';
import { SelfHealingResultRepository } from '../../self-healing/database/self-healing-result.repository';
import { SelfHealingChatService } from '../../self-healing/self-healing-chat.service';
import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

vi.mock('../../instance-ai.service', () => ({ InstanceAiService: vi.fn() }));
vi.mock('../../instance-ai-settings.service', () => ({ InstanceAiSettingsService: vi.fn() }));

describe('Self-healing private chat persistence', () => {
	let threads: InstanceAiThreadRepository;
	let messages: InstanceAiMessageRepository;
	let results: SelfHealingResultRepository;
	let txRunner: TransactionRunner;
	let memory: TypeORMAgentMemory;
	let service: SelfHealingChatService;
	const assistant = mock<InstanceAiService>();

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
		const result = await results.createResult(
			{
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
					promptTokens: null,
					completionTokens: null,
					totalTokens: null,
				},
			},
			{},
		);
		const prepare = async (reviewer: User = user) =>
			await txRunner.run({}, async (ctx) => await service.prepare(reviewer, result, ctx));
		return { user, project, workflow, result, prepare };
	}

	it('saves a report and workflow attachment that the normal chat history can read', async () => {
		const { user, project, workflow, result } = await fixture();
		const { threadId, created } = await txRunner.run(
			{},
			async (ctx) =>
				await service.prepare(user, result, ctx, { status: 'available', id: result.executionId }),
		);

		expect(created).toBe(true);
		expect(await threads.findOneByOrFail({ id: threadId })).toMatchObject({
			resourceId: user.id,
			projectId: project.id,
			selfHealingResultId: result.id,
			title: result.summary,
		});
		expect(parseStoredMessages(await memory.getMessages(threadId))).toEqual([
			expect.objectContaining({
				role: 'user',
				content: `Help me continue with this saved Assistant report. Read the current saved workflow before making more changes. The suggested changes may already be applied.\n\n${result.report}`,
				attachments: [{ type: 'workflow', id: workflow.id, executionId: result.executionId }],
			}),
		]);
		expect(assistant.startRun).not.toHaveBeenCalled();
	});

	it('reuses each reviewer’s private chat without copying an unavailable execution reference', async () => {
		const { user, workflow, result, prepare } = await fixture();
		const first = await prepare();
		expect(await prepare()).toEqual({ threadId: first.threadId, created: false });
		const other = await createUser();
		const second = await prepare(other);
		expect(second.threadId).not.toBe(first.threadId);
		expect(await service.canReadThread(user.id, first.threadId)).toBe(true);
		expect(await service.canReadThread(other.id, first.threadId)).toBe(false);
		expect(await service.canReadThread(other.id, second.threadId)).toBe(true);
		expect(await messages.countBy({ threadId: first.threadId })).toBe(1);
		expect(parseStoredMessages(await memory.getMessages(first.threadId))[0]?.attachments).toEqual([
			{ type: 'workflow', id: workflow.id },
		]);
		expect(await results.findOneByOrFail({ id: result.id })).toMatchObject({ continuedAt: null });
	});

	it('rolls back the thread and its report with the enclosing continuation transaction', async () => {
		const { user, result } = await fixture();
		let preparedId: string | undefined;
		await expect(
			txRunner.run({}, async (ctx) => {
				preparedId = (await service.prepare(user, result, ctx)).threadId;
				throw new Error('The workflow could not be saved.');
			}),
		).rejects.toThrow('The workflow could not be saved.');
		expect(preparedId).toBeDefined();
		expect(await threads.countBy({ selfHealingResultId: result.id })).toBe(0);
		expect(await messages.countBy({ threadId: preparedId })).toBe(0);
	});

	it('enforces one private chat per result and owner independently of editable metadata', async () => {
		const { user, project, result, prepare } = await fixture();
		const normal = await threads.save(
			threads.create({
				id: randomUUID(),
				resourceId: user.id,
				projectId: project.id,
				metadata: { sourceContext: { resultId: result.id } },
			}),
		);
		expect(await service.canReadThread(user.id, normal.id)).toBe(false);
		const { threadId } = await prepare();
		await expect(
			threads.insert({
				id: randomUUID(),
				resourceId: user.id,
				projectId: project.id,
				selfHealingResultId: result.id,
			}),
		).rejects.toThrow();
		expect(await threads.findSelfHealingChat(result.id, user.id, {})).toMatchObject({
			id: threadId,
		});
	});

	it('keeps the private conversation after the result is deleted', async () => {
		const { result, prepare } = await fixture();
		const { threadId } = await prepare();
		await results.delete(result.id);
		expect(await threads.findOneByOrFail({ id: threadId })).toMatchObject({
			selfHealingResultId: null,
		});
		expect(parseStoredMessages(await memory.getMessages(threadId))).toHaveLength(1);
	});

	it('detects a durable started turn while the normal parser hides its internal prompt', async () => {
		const { user, prepare } = await fixture();
		const { threadId } = await prepare();
		expect(await threads.hasUserTurnAfterOpening(threadId)).toBe(false);
		await memory.saveMessages({
			threadId,
			resourceId: user.id,
			messages: [
				{
					id: randomUUID(),
					createdAt: new Date(),
					type: 'llm',
					role: 'user',
					content: [{ type: 'text', text: AUTO_FOLLOW_UP_MESSAGE }],
				},
			],
		});
		expect(await threads.hasUserTurnAfterOpening(threadId)).toBe(true);
		expect(parseStoredMessages(await memory.getMessages(threadId))).toHaveLength(1);
	});
});
