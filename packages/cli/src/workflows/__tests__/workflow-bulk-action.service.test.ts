import type {
	FolderRepository,
	User,
	WorkflowEntity,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { ProjectService } from '@/services/project.service.ee';
import { WorkflowBulkActionService } from '@/workflows/workflow-bulk-action.service';
import type {
	AuthorizedWorkflow,
	WorkflowFinderService,
} from '@/workflows/workflow-finder.service';
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
	const authorize = <S extends Scope>(workflow: WorkflowEntity, scope: S): AuthorizedWorkflow<S> =>
		({ workflow, scope, userId: user.id }) as AuthorizedWorkflow<S>;

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
		workflowFinderService.findAuthorizedWorkflowsByIdsForUser.mockResolvedValue([
			authorize(mock<WorkflowEntity>({ id: 'workflow-1', isArchived: false }), 'workflow:delete'),
		]);

		await expect(service.archive(user, ['workflow-1', 'workflow-2'])).rejects.toBeInstanceOf(
			UnprocessableRequestError,
		);
		expect(workflowService.archiveAuthorized).not.toHaveBeenCalled();
	});

	it('finishes the active parallel batch and stops before the next batch on failure', async () => {
		const workflows = Array.from({ length: 6 }, (_, index) => `workflow-${index + 1}`).map((id) =>
			mock<WorkflowEntity>({ id, isArchived: false }),
		);
		workflowFinderService.findAuthorizedWorkflowsByIdsForUser.mockResolvedValue(
			workflows.map((workflow) => authorize(workflow, 'workflow:delete')),
		);
		workflowService.archiveAuthorized.mockImplementation(async (_user, authorized) => {
			if (authorized.workflow.id === 'workflow-2') throw new Error('hook rejected');
			return authorized.workflow;
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
		expect(workflowService.archiveAuthorized).toHaveBeenCalledTimes(5);
		expect(workflowService.archive).not.toHaveBeenCalled();
		expect(workflowFinderService.findAuthorizedWorkflowsByIdsForUser).toHaveBeenCalledTimes(1);
	});

	it('rejects permanent deletion unless every workflow is archived and fully unpublished', async () => {
		workflowFinderService.findAuthorizedWorkflowsByIdsForUser.mockResolvedValue([
			authorize(
				mock<WorkflowEntity>({
					id: 'not-archived',
					isArchived: false,
					activeVersionId: null,
				}),
				'workflow:delete',
			),
			authorize(
				mock<WorkflowEntity>({
					id: 'pending-unpublish',
					isArchived: true,
					activeVersionId: null,
				}),
				'workflow:delete',
			),
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
		expect(workflowService.deleteAuthorized).not.toHaveBeenCalled();
		expect(workflowService.delete).not.toHaveBeenCalled();
	});

	it('reports already-unpublished workflows as unchanged', async () => {
		workflowFinderService.findAuthorizedWorkflowsByIdsForUser.mockResolvedValue([
			authorize(
				mock<WorkflowEntity>({ id: 'workflow-1', activeVersionId: null }),
				'workflow:unpublish',
			),
		]);

		await expect(service.unpublish(user, ['workflow-1'])).resolves.toEqual({
			status: 'completed',
			results: [{ workflowId: 'workflow-1', status: 'unchanged' }],
		});
		expect(workflowService.deactivateAuthorized).not.toHaveBeenCalled();
		expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
	});
});
