import type { UserRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { FolderService } from '@/services/folder.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { OwnershipTransferHandlerRegistry } from '../ownership-transfer-handler.registry';
import type { ProjectOwnershipTransferHandler } from '../ownership-transfer-handler.registry';
import { OwnershipTransferService } from '../ownership-transfer.service';

describe('OwnershipTransferService', () => {
	const trx = mock<EntityManager>();
	const manager = mock<EntityManager>();
	const userRepository = mock<UserRepository>({ manager });
	const workflowService = mock<WorkflowService>();
	const credentialsService = mock<CredentialsService>();
	const folderService = mock<FolderService>();
	const ownershipService = mock<OwnershipService>();
	const handler = mock<ProjectOwnershipTransferHandler>();

	let service: OwnershipTransferService;

	beforeEach(() => {
		vi.clearAllMocks();
		manager.transaction.mockImplementation(
			async (runInTransaction: unknown) =>
				await (runInTransaction as (trx: EntityManager) => Promise<unknown>)(trx),
		);
		workflowService.transferAll.mockResolvedValue([]);

		const transferHandlers = new OwnershipTransferHandlerRegistry();
		transferHandlers.register(handler);

		service = new OwnershipTransferService(
			userRepository,
			workflowService,
			credentialsService,
			folderService,
			ownershipService,
			transferHandlers,
		);
	});

	it('should transfer workflows, credentials and folders for each project in one transaction', async () => {
		await service.transferAllResources(['from-1', 'from-2'], 'to');

		expect(manager.transaction).toHaveBeenCalledTimes(1);
		for (const fromProjectId of ['from-1', 'from-2']) {
			expect(workflowService.transferAll).toHaveBeenCalledWith(fromProjectId, 'to', trx);
			expect(credentialsService.transferAll).toHaveBeenCalledWith(fromProjectId, 'to', trx);
			expect(folderService.transferAllFoldersToProject).toHaveBeenCalledWith(
				fromProjectId,
				'to',
				trx,
			);
		}
	});

	it('should invalidate the workflow ownership cache for all transferred workflows', async () => {
		workflowService.transferAll
			.mockResolvedValueOnce(['wf-1', 'wf-2'])
			.mockResolvedValueOnce(['wf-3']);

		await service.transferAllResources(['from-1', 'from-2'], 'to');

		expect(ownershipService.invalidateWorkflowProjectCacheByIds).toHaveBeenCalledWith([
			'wf-1',
			'wf-2',
			'wf-3',
		]);
	});

	it('should run registered transfer handlers for each project inside the transaction', async () => {
		await service.transferAllResources(['from-1', 'from-2'], 'to');

		expect(handler.transferAll).toHaveBeenCalledWith('from-1', 'to', trx);
		expect(handler.transferAll).toHaveBeenCalledWith('from-2', 'to', trx);
	});

	it('should not invalidate the cache when a transfer handler fails, since the transaction rolls back', async () => {
		workflowService.transferAll.mockResolvedValueOnce(['wf-1']);
		handler.transferAll.mockRejectedValueOnce(new Error('boom'));

		await expect(service.transferAllResources(['from-1'], 'to')).rejects.toThrow('boom');

		expect(ownershipService.invalidateWorkflowProjectCacheByIds).not.toHaveBeenCalled();
	});

	it('should delete module-owned resources via registered handlers for each project', async () => {
		await service.deleteModuleOwnedResources(['p-1', 'p-2']);

		expect(handler.deleteAll).toHaveBeenCalledWith('p-1');
		expect(handler.deleteAll).toHaveBeenCalledWith('p-2');
		expect(manager.transaction).not.toHaveBeenCalled();
	});
});
