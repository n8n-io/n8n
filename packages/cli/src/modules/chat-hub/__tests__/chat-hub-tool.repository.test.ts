import { contextFromEntityManager, type TransactionRunner } from '@n8n/db';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';

import { ChatHubTool } from '../chat-hub-tool.entity';
import { ChatHubToolRepository } from '../chat-hub-tool.repository';

describe('ChatHubToolRepository', () => {
	const manager = mock<EntityManager>();
	const dataSource = mock<DataSource>({ manager });
	const runner = mock<TransactionRunner>();
	const repository = new ChatHubToolRepository(dataSource, runner);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		runner.run.mockImplementation(
			async (ctx, fn) => await fn(ctx.trx ? ctx : contextFromEntityManager(manager)),
		);
	});

	it('updates only a tool owned by the user', async () => {
		const tool = mock<ChatHubTool>();
		vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(tool);
		manager.update.mockResolvedValueOnce({ raw: [], generatedMaps: [], affected: 1 });
		manager.findOne.mockResolvedValueOnce(tool);

		await expect(repository.updateOwnedTool('tool', 'user', { enabled: false })).resolves.toBe(
			tool,
		);
		expect(manager.update).toHaveBeenCalledWith(
			ChatHubTool,
			{ id: 'tool', ownerId: 'user' },
			{ enabled: false },
		);
		expect(manager.findOne).toHaveBeenCalledWith(ChatHubTool, {
			where: { id: 'tool', ownerId: 'user' },
		});
	});

	it('does not update a tool that the user does not own', async () => {
		vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(null);
		const update = vi.spyOn(repository, 'updateTool');

		await expect(repository.updateOwnedTool('tool', 'user', { enabled: false })).rejects.toThrow(
			NotFoundError,
		);
		expect(update).not.toHaveBeenCalled();
		expect(runner.run).toHaveBeenCalledOnce();
	});

	it('rejects an update when ownership changes before the mutation', async () => {
		vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(mock<ChatHubTool>());
		manager.update.mockResolvedValueOnce({ raw: [], generatedMaps: [], affected: 0 });

		await expect(repository.updateOwnedTool('tool', 'user', { enabled: false })).rejects.toThrow(
			NotFoundError,
		);
		expect(manager.findOne).not.toHaveBeenCalled();
	});

	it('does not delete a tool that the user does not own', async () => {
		vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(null);
		const remove = vi.spyOn(repository, 'deleteTool');

		await expect(repository.deleteOwnedTool('tool', 'user')).rejects.toThrow(NotFoundError);
		expect(remove).not.toHaveBeenCalled();
	});

	it('joins the supplied manager when deleting an owned tool', async () => {
		const existing = vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(mock<ChatHubTool>());
		manager.delete.mockResolvedValueOnce({ raw: [], affected: 1 });

		await repository.deleteOwnedTool('tool', 'user', manager);

		expect(runner.run).toHaveBeenCalledWith(
			expect.objectContaining({ trx: expect.anything() }),
			expect.any(Function),
		);
		expect(existing).toHaveBeenCalledWith('tool', 'user', manager);
		expect(manager.delete).toHaveBeenCalledWith(ChatHubTool, { id: 'tool', ownerId: 'user' });
	});

	it('rejects a delete when ownership changes before the mutation', async () => {
		vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(mock<ChatHubTool>());
		manager.delete.mockResolvedValueOnce({ raw: [], affected: 0 });

		await expect(repository.deleteOwnedTool('tool', 'user')).rejects.toThrow(NotFoundError);
	});
});
