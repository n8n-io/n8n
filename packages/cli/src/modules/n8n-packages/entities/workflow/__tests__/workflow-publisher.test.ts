import type { Logger } from '@n8n/backend-common';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { PersistedWorkflowPlanItem } from '../workflow-import.types';
import { WorkflowPublisher } from '../workflow-publisher';
import { WorkflowPublishingPolicy } from '../workflow-publishing-policy.types';

// The publish/unpublish matrix is covered end-to-end by
// `import-pipeline.integration.test.ts`. These unit tests cover the permission
// gate and the publish-failure fallback the integration suite can't reach (it
// always runs as an authorized owner against publishable workflows).
describe('WorkflowPublisher', () => {
	const user = mock<User>({ id: 'user-1' });
	const logger = mock<Logger>();
	const projectRepository = mock<{ existsBy: jest.Mock }>();
	const projectService = mock<ProjectService>();
	const workflowService = mock<WorkflowService>();
	let publisher: WorkflowPublisher;

	beforeEach(() => {
		jest.clearAllMocks();
		publisher = new WorkflowPublisher(
			logger,
			projectRepository as never,
			projectService,
			workflowService,
		);
	});

	describe('assertCanPublish', () => {
		it('does nothing for policies other than publish-all', async () => {
			await publisher.assertCanPublish(user, 'project-1', WorkflowPublishingPolicy.MatchSource);

			expect(projectService.getProjectWithScope).not.toHaveBeenCalled();
		});

		it('passes when the user can publish in the target project', async () => {
			projectService.getProjectWithScope.mockResolvedValue(mock<Project>({ id: 'project-1' }));

			await expect(
				publisher.assertCanPublish(user, 'project-1', WorkflowPublishingPolicy.PublishAll),
			).resolves.toBeUndefined();
		});

		it('throws ForbiddenError when the project exists but publish scope is missing', async () => {
			projectService.getProjectWithScope.mockResolvedValue(null);
			projectRepository.existsBy.mockResolvedValue(true);

			await expect(
				publisher.assertCanPublish(user, 'project-1', WorkflowPublishingPolicy.PublishAll),
			).rejects.toThrow(ForbiddenError);
		});

		it('throws NotFoundError when the project does not exist', async () => {
			projectService.getProjectWithScope.mockResolvedValue(null);
			projectRepository.existsBy.mockResolvedValue(false);

			await expect(
				publisher.assertCanPublish(user, 'missing-project', WorkflowPublishingPolicy.PublishAll),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('apply', () => {
		const createItem = (sourcePublished: boolean): PersistedWorkflowPlanItem => ({
			action: 'create',
			sourceWorkflowId: 'wf-1',
			decidedId: 'wf-1',
			sourcePublished,
			entity: mock<WorkflowEntity>(),
		});

		it('does not touch the workflow when the policy resolves to noop', async () => {
			const workflow = mock<WorkflowEntity>({
				id: 'wf-1',
				activeVersionId: null,
				isArchived: false,
			});

			const result = await publisher.apply(
				user,
				createItem(false),
				workflow,
				WorkflowPublishingPolicy.PreservePublishedState,
			);

			expect(result).toBe(workflow);
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
			expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
		});

		it('publishes when the policy requires it', async () => {
			const workflow = mock<WorkflowEntity>({
				id: 'wf-1',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
			});
			const published = mock<WorkflowEntity>({ id: 'wf-1', activeVersionId: 'v1' });
			workflowService.activateWorkflow.mockResolvedValue(published);

			const result = await publisher.apply(
				user,
				createItem(true),
				workflow,
				WorkflowPublishingPolicy.PublishAll,
			);

			expect(workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
				versionId: 'v1',
				source: 'import',
			});
			expect(result).toBe(published);
		});

		it('keeps the saved workflow and logs when publishing fails', async () => {
			const workflow = mock<WorkflowEntity>({
				id: 'wf-1',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
			});
			workflowService.activateWorkflow.mockRejectedValue(new Error('no trigger node'));

			const result = await publisher.apply(
				user,
				createItem(true),
				workflow,
				WorkflowPublishingPolicy.PublishAll,
			);

			expect(result).toBe(workflow);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to apply publishing policy to imported workflow',
				expect.objectContaining({ workflowId: 'wf-1', action: 'publish' }),
			);
		});
	});
});
