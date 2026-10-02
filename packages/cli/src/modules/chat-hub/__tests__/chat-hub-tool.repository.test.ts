import { contextFromEntityManager, type TransactionRunner } from '@n8n/db';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';

import { ChatHubToolRepository } from '../chat-hub-tool.repository';

describe('ChatHubToolRepository', () => {
	const manager = mock<EntityManager>();
	const dataSource = mock<DataSource>({ manager });
	const runner = mock<TransactionRunner>();
	const repository = new ChatHubToolRepository(dataSource, runner);

	beforeEach(() => {
		vi.clearAllMocks();
		runner.run.mockImplementation(
			async (ctx, fn) => await fn(ctx.trx ? ctx : contextFromEntityManager(manager)),
		);
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

	it('joins the supplied manager when deleting an owned tool', async () => {
		const existing = vi.spyOn(repository, 'getOneById').mockResolvedValueOnce(mock());
		const remove = vi.spyOn(repository, 'deleteTool').mockResolvedValueOnce(mock());

		await repository.deleteOwnedTool('tool', 'user', manager);

		expect(runner.run).toHaveBeenCalledWith(
			expect.objectContaining({ trx: expect.anything() }),
			expect.any(Function),
		);
		expect(existing).toHaveBeenCalledWith('tool', 'user', manager);
		expect(remove).toHaveBeenCalledWith('tool', manager);
	});
});
