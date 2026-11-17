import type { EventService } from '@n8n/backend-services';
import type {
	Folder,
	FolderRepository,
	TransactionRunner,
	User,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { FolderContentService } from '@/services/folder-content.service';
import { WorkflowFolderService } from '@/services/workflow-folder.service';
import { FolderService } from '@/services/folder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

describe('FolderService', () => {
	const folderRepository = mock<FolderRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowService = mock<WorkflowService>();
	const transactions = mock<TransactionRunner>();
	const folderService = new FolderService(
		folderRepository,
		mock(),
		mock<EventService>(),
		new FolderContentService(new WorkflowFolderService(workflowRepository, workflowService)),
		transactions,
	);
	const user = mock<User>();

	beforeEach(() => {
		vi.clearAllMocks();
		folderRepository.findOneOrFailFolderInProject.mockResolvedValue(
			mock<Folder>({ id: 'folder-1', resourceType: 'workflow' }),
		);
		folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue([]);
		workflowRepository.findIdsInFolders.mockResolvedValue(['wf-1', 'wf-2']);
		workflowService.archive.mockResolvedValue(mock<WorkflowEntity>());
		transactions.run.mockImplementation(async (ctx, callback) => await callback(ctx));
	});

	describe('deleteFolder without a transfer target', () => {
		it('keeps the folder when a workflow cannot be archived', async () => {
			workflowService.archive.mockResolvedValueOnce(undefined);

			await expect(folderService.deleteFolder(user, 'folder-1', 'project-1', {})).rejects.toThrow(
				'You do not have permission to archive all workflows in this folder.',
			);

			expect(workflowRepository.moveArchivedFolderContentsToRoot).not.toHaveBeenCalled();
			expect(folderRepository.deleteFolderSubtree).not.toHaveBeenCalled();
		});

		it('passes the operation context to each workflow it archives', async () => {
			const ctx = { security: mock<SecurityContext>({ subIdentityId: 'login-1' }) };

			await folderService.deleteFolder(user, 'folder-1', 'project-1', {}, ctx);

			expect(workflowService.archive).toHaveBeenCalledTimes(2);
			expect(workflowService.archive).toHaveBeenCalledWith(
				user,
				'wf-1',
				{ skipArchived: true },
				ctx,
			);
			expect(workflowService.archive).toHaveBeenCalledWith(
				user,
				'wf-2',
				{ skipArchived: true },
				ctx,
			);
		});

		it('archives with an empty operation context when none is given', async () => {
			await folderService.deleteFolder(user, 'folder-1', 'project-1', {});

			expect(workflowService.archive).toHaveBeenCalledWith(
				user,
				'wf-1',
				{ skipArchived: true },
				{},
			);
		});
	});
});
