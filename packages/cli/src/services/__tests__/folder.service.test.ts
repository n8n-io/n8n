import type { EventService } from '@n8n/backend-services';
import type { Folder, FolderRepository, User, WorkflowRepository } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { FolderService } from '@/services/folder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

describe('FolderService', () => {
	const folderRepository = mock<FolderRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowService = mock<WorkflowService>();
	const folderService = new FolderService(
		folderRepository,
		mock(),
		workflowRepository,
		workflowService,
		mock<EventService>(),
	);
	const user = mock<User>();

	beforeEach(() => {
		vi.clearAllMocks();
		folderRepository.findOneOrFailFolderInProject.mockResolvedValue(mock<Folder>());
		workflowRepository.getAllWorkflowIdsInHierarchy.mockResolvedValue(['wf-1', 'wf-2']);
	});

	describe('deleteFolder without a transfer target', () => {
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
