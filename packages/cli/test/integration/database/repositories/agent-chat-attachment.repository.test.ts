import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentChatAttachment } from '@/modules/agents/entities/agent-chat-attachment.entity';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentChatAttachmentRepository } from '@/modules/agents/repositories/agent-chat-attachment.repository';

describe('AgentChatAttachmentRepository', () => {
	let repository: AgentChatAttachmentRepository;
	let table: Repository<AgentChatAttachment>;
	let transactionRunner: TransactionRunner;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentChatAttachmentRepository);
		table = Container.get(DataSource).getRepository(AgentChatAttachment);
		transactionRunner = Container.get(TransactionRunner);
		projectId = (await createTeamProject()).id;
		agentId = (
			await Container.get(DataSource).getRepository(Agent).save({
				id: randomUUID(),
				name: 'Attachment agent',
				projectId,
				integrations: [],
				tools: {},
			})
		).id;
	});

	afterEach(async () => {
		await table.delete({ agentId });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const attachmentParams = () => ({
		agentId,
		projectId,
		threadId: 'thread-1',
		createdByThreadId: 'thread-1',
		resourceId: 'resource-1',
		binaryDataId: 'filesystem-v2:file',
		fileName: 'file.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 1,
		source: 'chat',
	});

	it('generates an ID and updates the same row when the ID already exists', async () => {
		const params = attachmentParams();
		const original = await repository.saveInboundAttachment(params, {});
		expect(original).toBeInstanceOf(AgentChatAttachment);
		expect(original.id).toEqual(expect.any(String));
		expect(original.id).not.toBe('');
		const oldUpdatedAt = new Date('2020-01-01T00:00:00.000Z');
		await table.update(original.id, { updatedAt: oldUpdatedAt });

		const saved = await repository.saveInboundAttachment(
			{ ...params, id: original.id, fileName: 'updated.txt' },
			{},
		);

		expect(await table.countBy({ agentId })).toBe(1);
		expect(await table.findOneByOrFail({ id: original.id })).toMatchObject({
			id: saved.id,
			fileName: 'updated.txt',
			createdAt: original.createdAt,
		});
		expect(saved.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
	});

	it('uses the active transaction for every lookup, save and delete', async () => {
		const original = await repository.saveInboundAttachment(attachmentParams(), {});
		const rollback = new Error('Rollback attachment changes');

		await expect(
			transactionRunner.run({}, async (ctx) => {
				const changed = {
					...original,
					...(await repository.saveInboundAttachment(
						{ ...attachmentParams(), id: original.id, fileName: 'transaction.txt' },
						ctx,
					)),
				};
				const scope = { projectId, threadId: original.threadId };
				expect(await repository.findByIdInThread(original.id, scope, ctx)).toEqual(changed);
				expect(await repository.findByIdsInThread([original.id], scope, ctx)).toEqual([changed]);
				expect(await repository.findByIdForAgent(original.id, { agentId, projectId }, ctx)).toEqual(
					changed,
				);
				expect(
					await repository.findByIdForSystemAgent(
						original.id,
						{ agentId, resourceId: 'resource-1', source: 'chat' },
						ctx,
					),
				).toEqual(changed);
				expect(await repository.findByThread(original.threadId, { projectId }, ctx)).toEqual([
					changed,
				]);
				expect(await repository.findByIds([original.id], ctx)).toEqual([changed]);
				expect(await repository.findByAgent(agentId, ctx)).toEqual([changed]);
				expect(
					await repository.findFromSourceCreatedBefore(
						{ agentId, source: 'chat' },
						new Date(Date.now() + 60_000),
						1,
						ctx,
					),
				).toEqual([changed]);
				expect(await repository.deleteByIds([original.id], ctx)).toBeUndefined();
				expect(await repository.findByIds([original.id], ctx)).toEqual([]);
				throw rollback;
			}),
		).rejects.toBe(rollback);

		expect(await table.findOneByOrFail({ id: original.id })).toEqual(original);
	});

	it('returns null for a missing row and accepts deletion of a missing ID', async () => {
		const ctx: OperationContext = {};
		expect(
			await repository.findByIdInThread('missing', { projectId, threadId: 'thread-1' }, ctx),
		).toBeNull();
		expect(await repository.deleteByIds(['missing'], ctx)).toBeUndefined();
	});
});
