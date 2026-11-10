import type { EventService } from '@n8n/backend-services';
import {
	Folder,
	type FolderRepository,
	type FolderTagMappingRepository,
	type TransactionRunner,
	type User,
	type WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { PROJECT_ROOT } from 'n8n-workflow';

import type { WorkflowService } from '@/workflows/workflow.service';
import { FolderContentService, type FolderContentHandler } from '../folder-content.service';
import { FolderService } from '../folder.service';

vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));

describe('Agent folder operations', () => {
	const user = mock<User>();
	const repository = mock<FolderRepository>();
	const handler = mock<FolderContentHandler>();
	const transactions = mock<TransactionRunner>();
	const events = mock<EventService>();
	let service: FolderService;

	function folder(
		id: string,
		parentFolderId: string | null = null,
		resourceType: 'agent' | 'workflow' = 'agent',
	) {
		return Object.assign(new Folder(), { id, name: id, parentFolderId, resourceType });
	}

	beforeEach(() => {
		vi.resetAllMocks();
		const content = new FolderContentService();
		content.register('agent', handler);
		service = new FolderService(
			repository,
			mock<FolderTagMappingRepository>(),
			mock<WorkflowRepository>(),
			mock<WorkflowService>(),
			events,
			content,
			transactions,
		);
		repository.findOneOrFailFolderInProject.mockResolvedValue(folder('source'));
		repository.getAllFolderIdsInHierarchy.mockResolvedValue(['child']);
		transactions.run.mockImplementation(async (ctx, callback) => await callback(ctx));
	});

	it('relocates direct Agents and child folders in one transaction', async () => {
		await service.deleteFolder(user, 'source', 'project', { transferToFolderId: PROJECT_ROOT });

		expect(handler.assertAccess).toHaveBeenCalledWith(user, 'project', 'update');
		expect(transactions.run).toHaveBeenCalledOnce();
		expect(handler.relocate).toHaveBeenCalledWith('project', 'source', null, {});
		expect(repository.relocateChildrenAndDelete).toHaveBeenCalledWith(
			'source',
			'project',
			'agent',
			null,
			{},
		);
		expect(handler.deleteContents).not.toHaveBeenCalled();
	});

	it('keeps all folders when Agent lifecycle cleanup fails', async () => {
		handler.deleteContents.mockRejectedValue(new Error('Cleanup failed'));

		await expect(service.deleteFolder(user, 'source', 'project', {})).rejects.toThrow(
			'Cleanup failed',
		);

		expect(handler.assertAccess).toHaveBeenCalledWith(user, 'project', 'delete');
		expect(handler.deleteContents).toHaveBeenCalledWith(user, 'project', ['source', 'child']);
		expect(repository.delete).not.toHaveBeenCalled();
		expect(events.emit).not.toHaveBeenCalled();
	});

	it('deletes folders only after successful Agent cleanup', async () => {
		await service.deleteFolder(user, 'source', 'project', {});

		expect(repository.getAllFolderIdsInHierarchy).toHaveBeenCalledWith(
			'source',
			'project',
			'agent',
		);
		expect(repository.delete).toHaveBeenCalledWith({
			id: 'source',
			homeProject: { id: 'project' },
			resourceType: 'agent',
		});
		expect(handler.deleteContents.mock.invocationCallOrder[0]).toBeLessThan(
			repository.delete.mock.invocationCallOrder[0],
		);
	});

	it('rejects a relocation into the other resource tree before writes', async () => {
		repository.findOneOrFailFolderInProject.mockImplementation(async (id) =>
			folder(id, null, id === 'target' ? 'workflow' : 'agent'),
		);

		await expect(
			service.deleteFolder(user, 'source', 'project', { transferToFolderId: 'target' }),
		).rejects.toThrow('different resource tree');

		expect(transactions.run).not.toHaveBeenCalled();
	});

	it('rejects relocation into a descendant', async () => {
		repository.findOneOrFailFolderInProject.mockImplementation(async (id) => folder(id));
		repository.getAncestorPath.mockResolvedValue([folder('source'), folder('target', 'source')]);

		await expect(
			service.deleteFolder(user, 'source', 'project', { transferToFolderId: 'target' }),
		).rejects.toThrow('descendant');

		expect(transactions.run).not.toHaveBeenCalled();
	});

	it('rejects an invalid folder name before persistence', async () => {
		await expect(
			service.createFolder({ name: '../Folder', resourceType: 'agent' }, 'project'),
		).rejects.toThrow();

		expect(repository.save).not.toHaveBeenCalled();
	});
});
