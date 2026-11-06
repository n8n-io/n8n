import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v4 as uuid } from 'uuid';

import { AgentFile } from '@/modules/agents/entities/agent-file.entity';
import { AgentFileRepository } from '@/modules/agents/repositories/agent-file.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentFileRepository', () => {
	let agentRepo: AgentRepository;
	let fileRepo: AgentFileRepository;
	let fileTable: Repository<AgentFile>;
	let transactionRunner: TransactionRunner;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		fileRepo = Container.get(AgentFileRepository);
		fileTable = Container.get(DataSource).getRepository(AgentFile);
		transactionRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
	});

	afterEach(async () => {
		await fileTable.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(): Promise<string> {
		const agentId = uuid();
		await agentRepo.insert({
			id: agentId,
			name: 'Knowledge agent',
			projectId,
			schema: null,
		});

		return agentId;
	}

	function fileParams(agentId: string, fileName: string, fileSizeBytes: number) {
		const fileId = generateNanoId();
		return {
			id: fileId,
			agentId,
			storedAt: 'db' as const,
			storageKey: `agents/${agentId}/knowledge-files/${fileId}/content`,
			fileName,
			mimeType: 'text/plain',
			fileSizeBytes,
		};
	}

	async function addFile(agentId: string, fileName: string, fileSizeBytes: number) {
		await fileTable.insert(fileParams(agentId, fileName, fileSizeBytes));
	}

	it('saves the supplied ID and updates the same row with the entity hooks', async () => {
		const agentId = await createAgent();
		const params = fileParams(agentId, 'original.txt', 100);
		const original = await fileRepo.saveUploadedFile(params, {});
		expect(original).toBeInstanceOf(AgentFile);
		expect(original).toMatchObject(params);
		const oldUpdatedAt = new Date('2020-01-01T00:00:00.000Z');
		await fileTable.update(original.id, { updatedAt: oldUpdatedAt });

		const saved = await fileRepo.saveUploadedFile({ ...params, fileName: 'updated.txt' }, {});

		expect(saved).toBeInstanceOf(AgentFile);
		expect(saved).toMatchObject({ id: params.id, fileName: 'updated.txt' });
		expect(saved.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
		expect(await fileTable.countBy({ agentId })).toBe(1);
		expect(await fileTable.findOneByOrFail({ id: params.id })).toMatchObject({
			fileName: 'updated.txt',
			createdAt: original.createdAt,
		});
	});

	it('rejects a duplicate file name for the same agent', async () => {
		const agentId = await createAgent();
		await addFile(agentId, 'duplicate.txt', 100);

		await expect(
			fileRepo.saveUploadedFile(fileParams(agentId, 'duplicate.txt', 200), {}),
		).rejects.toThrow();
		expect(await fileTable.countBy({ agentId })).toBe(1);
	});

	it('orders files by creation time and then ID within the selected agent', async () => {
		const agentId = await createAgent();
		const otherAgentId = await createAgent();
		const createdAt = new Date('2020-01-01T00:00:00.000Z');
		await fileTable.insert([
			{ ...fileParams(agentId, 'b.txt', 20), id: 'b', createdAt },
			{ ...fileParams(agentId, 'a.txt', 10), id: 'a', createdAt },
			{
				...fileParams(agentId, 'earlier.txt', 30),
				id: 'z',
				createdAt: new Date(createdAt.getTime() - 1000),
			},
			fileParams(otherAgentId, 'other.txt', 40),
		]);

		expect((await fileRepo.findByAgentId(agentId, {})).map(({ id }) => id)).toEqual([
			'z',
			'a',
			'b',
		]);
	});

	it('uses the active transaction for all saves, reads, totals and deletes', async () => {
		const agentId = await createAgent();
		const otherAgentId = await createAgent();
		const originalParams = fileParams(agentId, 'original.txt', 100);
		const original = await fileRepo.saveUploadedFile(originalParams, {});
		const other = await fileRepo.saveUploadedFile(fileParams(otherAgentId, 'other.txt', 50), {});
		const added = fileParams(agentId, 'added.txt', 200);
		const rollback = new Error('Rollback file changes');

		await expect(
			transactionRunner.run({}, async (ctx) => {
				await fileRepo.saveUploadedFile({ ...originalParams, fileName: 'updated.txt' }, ctx);
				await fileRepo.saveUploadedFile(added, ctx);
				expect(await fileRepo.findByIdAndAgentId(original.id, agentId, ctx)).toMatchObject({
					fileName: 'updated.txt',
				});
				expect(await fileRepo.findByIdAndAgentId(original.id, otherAgentId, ctx)).toBeNull();
				expect(await fileRepo.findByAgentId(agentId, ctx)).toHaveLength(2);
				expect(await fileRepo.hasFilesForAgent(agentId, ctx)).toBe(true);
				expect(await fileRepo.getKnowledgeTotals(agentId, ctx)).toEqual({
					fileCount: 2,
					totalBytes: 300,
				});
				expect(await fileRepo.getKnowledgeTotalsByAgentIds([agentId, otherAgentId], ctx)).toEqual(
					new Map([
						[agentId, { fileCount: 2, totalBytes: 300 }],
						[otherAgentId, { fileCount: 1, totalBytes: 50 }],
					]),
				);
				expect(await fileRepo.deleteByIdAndAgentId(original.id, otherAgentId, ctx)).toBeUndefined();
				expect(await fileRepo.findByIdAndAgentId(original.id, agentId, ctx)).not.toBeNull();
				expect(await fileRepo.deleteByIdAndAgentId(original.id, agentId, ctx)).toBeUndefined();
				expect(await fileRepo.findByIdAndAgentId(original.id, agentId, ctx)).toBeNull();
				expect((await fileRepo.findByAgentId(agentId, ctx)).map(({ id }) => id)).toEqual([
					added.id,
				]);
				expect(await fileRepo.deleteByAgentId(agentId, ctx)).toBeUndefined();
				expect(await fileRepo.hasFilesForAgent(agentId, ctx)).toBe(false);
				expect(await fileRepo.findByIdAndAgentId(other.id, otherAgentId, ctx)).toEqual(other);
				throw rollback;
			}),
		).rejects.toBe(rollback);

		expect(await fileTable.findOneByOrFail({ id: original.id })).toEqual(original);
		expect(await fileTable.findOneBy({ id: added.id })).toBeNull();
	});

	it('returns null for missing rows and accepts deletion of missing rows', async () => {
		const agentId = await createAgent();
		expect(await fileRepo.findByIdAndAgentId('missing', agentId, {})).toBeNull();
		expect(await fileRepo.deleteByIdAndAgentId('missing', agentId, {})).toBeUndefined();
		expect(await fileRepo.deleteByAgentId(agentId, {})).toBeUndefined();
	});

	it('returns the file count and the size sum of an agent', async () => {
		const agentId = await createAgent();
		await addFile(agentId, 'a.txt', 100);
		await addFile(agentId, 'b.txt', 250);

		await expect(fileRepo.getKnowledgeTotals(agentId, {})).resolves.toEqual({
			fileCount: 2,
			totalBytes: 350,
		});
	});

	it('returns zero totals for an agent without files', async () => {
		const agentId = await createAgent();

		await expect(fileRepo.getKnowledgeTotals(agentId, {})).resolves.toEqual({
			fileCount: 0,
			totalBytes: 0,
		});
	});

	it('returns the totals of each agent and leaves out agents without files', async () => {
		const firstAgentId = await createAgent();
		const secondAgentId = await createAgent();
		const agentWithoutFilesId = await createAgent();
		await addFile(firstAgentId, 'a.txt', 100);
		await addFile(secondAgentId, 'a.txt', 40);
		await addFile(secondAgentId, 'b.txt', 60);

		const totalsByAgentId = await fileRepo.getKnowledgeTotalsByAgentIds(
			[firstAgentId, secondAgentId, agentWithoutFilesId],
			{},
		);

		expect(totalsByAgentId).toEqual(
			new Map([
				[firstAgentId, { fileCount: 1, totalBytes: 100 }],
				[secondAgentId, { fileCount: 2, totalBytes: 100 }],
			]),
		);
	});

	it('returns an empty map for an empty list of agents', async () => {
		await expect(fileRepo.getKnowledgeTotalsByAgentIds([], {})).resolves.toEqual(new Map());
	});
});
