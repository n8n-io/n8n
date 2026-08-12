import type {
	FolderRepository,
	User,
	WorkflowEntity,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { ProjectService } from '@/services/project.service.ee';
import { WorkflowBulkActionService } from '@/workflows/workflow-bulk-action.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

describe('WorkflowBulkActionService', () => {
	const user = mock<User>({ id: 'user-1' });
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowService = mock<WorkflowService>();
	const enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
	const collaborationService = mock<CollaborationService>();
	const projectService = mock<ProjectService>();
	const folderRepository = mock<FolderRepository>();
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	let service: WorkflowBulkActionService;

	beforeEach(() => {
		vi.clearAllMocks();
		workflowPublishedVersionRepository.getWorkflowIdsWithPublishedVersion.mockResolvedValue(
			new Set(),
		);
		service = new WorkflowBulkActionService(
			workflowFinderService,
			workflowService,
			enterpriseWorkflowService,
			collaborationService,
			projectService,
			folderRepository,
			workflowPublishedVersionRepository,
			credentialsFinderService,
		);
	});

	it('rejects the whole request when one workflow is inaccessible', async () => {
		workflowFinderService.findWorkflowsByIdsForUser.mockResolvedValue([
			mock<WorkflowEntity>({ id: 'workflow-1', isArchived: false }),
		]);

		await expect(service.archive(user, ['workflow-1', 'workflow-2'])).rejects.toBeInstanceOf(
			UnprocessableRequestError,
		);
		expect(workflowService.archive).not.toHaveBeenCalled();
	});

	it('finishes the active parallel batch and stops before the next batch on failure', async () => {
		const workflows = Array.from({ length: 6 }, (_, index) => `workflow-${index + 1}`).map((id) =>
			mock<WorkflowEntity>({ id, isArchived: false }),
		);
		workflowFinderService.findWorkflowsByIdsForUser.mockResolvedValue(workflows);
		workflowService.archive.mockImplementation(async (_user, workflowId) => {
			if (workflowId === 'workflow-2') throw new Error('hook rejected');
			return workflows.find(({ id }) => id === workflowId);
		});

		await expect(
			service.archive(
				user,
				workflows.map(({ id }) => id),
			),
		).resolves.toEqual({
			status: 'partial',
			results: [
				{ workflowId: 'workflow-1', status: 'completed' },
				{
					workflowId: 'workflow-2',
					status: 'failed',
					reason: 'runtimeFailure',
					message: 'hook rejected',
				},
				{ workflowId: 'workflow-3', status: 'completed' },
				{ workflowId: 'workflow-4', status: 'completed' },
				{ workflowId: 'workflow-5', status: 'completed' },
				{ workflowId: 'workflow-6', status: 'notAttempted' },
			],
		});
		expect(workflowService.archive).toHaveBeenCalledTimes(5);
	});

	it('rejects permanent deletion unless every workflow is archived and fully unpublished', async () => {
		workflowFinderService.findWorkflowsByIdsForUser.mockResolvedValue([
			mock<WorkflowEntity>({
				id: 'not-archived',
				isArchived: false,
				activeVersionId: null,
			}),
			mock<WorkflowEntity>({
				id: 'pending-unpublish',
				isArchived: true,
				activeVersionId: null,
			}),
		]);
		workflowPublishedVersionRepository.getWorkflowIdsWithPublishedVersion.mockResolvedValue(
			new Set(['pending-unpublish']),
		);

		await expect(service.delete(user, ['not-archived', 'pending-unpublish'])).rejects.toMatchObject(
			{
				meta: {
					issues: [
						expect.objectContaining({ workflowId: 'not-archived', reason: 'notArchived' }),
						expect.objectContaining({
							workflowId: 'pending-unpublish',
							reason: 'unpublishPending',
						}),
					],
				},
			},
		);
		expect(workflowService.delete).not.toHaveBeenCalled();
	});

	it('reports already-unpublished workflows as unchanged', async () => {
		workflowFinderService.findWorkflowsByIdsForUser.mockResolvedValue([
			mock<WorkflowEntity>({ id: 'workflow-1', activeVersionId: null }),
		]);

		await expect(service.unpublish(user, ['workflow-1'])).resolves.toEqual({
			status: 'completed',
			results: [{ workflowId: 'workflow-1', status: 'unchanged' }],
		});
		expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
	});
});
