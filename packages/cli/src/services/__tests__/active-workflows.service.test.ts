import type { WorkflowsConfig } from '@n8n/config';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, WorkflowEntity } from '@n8n/db';
import type { User, WorkflowRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@n8n/errors';
import type { ProjectScopeService, WorkflowSharingService } from '@n8n/backend-services';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';
import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('ActiveWorkflowsService', () => {
	const user = mock<User>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const projectScopeService = mock<ProjectScopeService>();
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService: false });
	const workflowPublicationStatusService = mock<WorkflowPublicationStatusService>();
	const service = new ActiveWorkflowsService(
		mock(),
		workflowRepository,
		workflowSharingService,
		activationErrorsService,
		workflowFinderService,
		workflowsConfig,
		workflowPublicationStatusService,
	);
	const activeIds = ['1', '2', '3', '4'];

	beforeEach(() => vi.clearAllMocks());

	describe('getAllActiveIdsInStorage', () => {
		it('should filter out any workflow ids that have activation errors', async () => {
			activationErrorsService.getAll.mockResolvedValue({ 1: 'some error' });
			workflowRepository.getActiveIds.mockResolvedValue(activeIds);

			const ids = await service.getAllActiveIdsInStorage();
			expect(ids).toEqual(['2', '3', '4']);
			expect(workflowPublicationStatusService.getListStatusesByWorkflowIds).not.toHaveBeenCalled();
		});
	});

	describe('getAllActiveIdsFor', () => {
		beforeEach(() => {
			activationErrorsService.getAll.mockResolvedValue({ 1: 'some error' });
			workflowRepository.getActiveIds.mockResolvedValue(activeIds);
		});

		it('should return all workflow ids when the user can list workflows globally', async () => {
			user.role = GLOBAL_ADMIN_ROLE;
			projectScopeService.getProjectRoleSlugs.mockResolvedValue(null);
			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['2', '3', '4']);
			expect(workflowSharingService.getSharedWorkflowIds).not.toHaveBeenCalled();
		});

		it.each([
			{ accessible: ['3'], expected: ['3'] },
			{ accessible: [], expected: [] },
		])(
			'should return only workflow ids the member has access to (accessible: $accessible)',
			async ({ accessible, expected }) => {
				user.role = GLOBAL_MEMBER_ROLE;
				workflowSharingService.getSharedWorkflowIds.mockResolvedValue(accessible);

				const ids = await service.getAllActiveIdsFor(user);

				expect(ids).toEqual(expected);
				expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
					scopes: ['workflow:read'],
				});
			},
		);
	});

	describe('getActivationError', () => {
		const workflowId = 'workflowId';

		it('should throw a BadRequestError a user does not have access to the workflow id', async () => {
			workflowsConfig.useWorkflowPublicationService = true;
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			await expect(service.getActivationError(workflowId, user)).rejects.toThrow(BadRequestError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).not.toHaveBeenCalled();
			expect(workflowPublicationStatusService.getFailedActivationError).not.toHaveBeenCalled();
			workflowsConfig.useWorkflowPublicationService = false;
		});

		it('should return the error when the user has access', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(new WorkflowEntity());
			activationErrorsService.get.mockResolvedValue('some-error');
			const error = await service.getActivationError(workflowId, user);

			expect(error).toEqual('some-error');
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, user, [
				'workflow:read',
			]);
			expect(activationErrorsService.get).toHaveBeenCalledWith(workflowId);
			expect(workflowPublicationStatusService.getFailedActivationError).not.toHaveBeenCalled();
		});
	});

	describe('with the publication service on', () => {
		beforeEach(() => {
			workflowsConfig.useWorkflowPublicationService = true;
			activationErrorsService.getAll.mockResolvedValue({ 1: 'some error' });
			workflowRepository.getActiveIds.mockResolvedValue(['1', '2', '3', '4', '5']);
			workflowPublicationStatusService.getListStatusesByWorkflowIds.mockResolvedValue(
				new Map([
					['2', 'failed'],
					['3', 'partial'],
					['5', 'published'],
				]),
			);
		});

		afterEach(() => {
			workflowsConfig.useWorkflowPublicationService = false;
		});

		it('drops workflows whose publication failed from the stored active ids', async () => {
			const ids = await service.getAllActiveIdsInStorage();

			expect(ids).toEqual(['3', '4', '5']);
			expect(workflowPublicationStatusService.getListStatusesByWorkflowIds).toHaveBeenCalledWith([
				'2',
				'3',
				'4',
				'5',
			]);
		});

		it('drops workflows whose publication failed for an owner', async () => {
			user.role = GLOBAL_OWNER_ROLE;

			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['3', '4', '5']);
			expect(workflowPublicationStatusService.getListStatusesByWorkflowIds).toHaveBeenCalledWith([
				'2',
				'3',
				'4',
				'5',
			]);
		});

		it('checks only the workflows a member can read', async () => {
			user.role = GLOBAL_MEMBER_ROLE;
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['2', '3']);

			const ids = await service.getAllActiveIdsFor(user);

			expect(ids).toEqual(['3']);
			expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: ['workflow:read'],
			});
			expect(workflowPublicationStatusService.getListStatusesByWorkflowIds).toHaveBeenCalledWith([
				'2',
				'3',
			]);
		});

		describe('getActivationError', () => {
			const workflowId = 'workflowId';
			const nodes: INode[] = [
				{
					id: 'node-1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			];

			beforeEach(() => {
				workflowFinderService.findWorkflowForUser.mockResolvedValue(
					Object.assign(new WorkflowEntity(), { nodes }),
				);
			});

			it('returns the publication error before the legacy one', async () => {
				workflowPublicationStatusService.getFailedActivationError.mockResolvedValue(
					'publication error',
				);
				activationErrorsService.get.mockResolvedValue('runtime error');

				expect(await service.getActivationError(workflowId, user)).toBe('publication error');
				expect(activationErrorsService.get).not.toHaveBeenCalled();
			});

			it('falls back to the legacy error when the publication did not fail', async () => {
				workflowPublicationStatusService.getFailedActivationError.mockResolvedValue(null);
				activationErrorsService.get.mockResolvedValue('runtime error');

				expect(await service.getActivationError(workflowId, user)).toBe('runtime error');
				expect(workflowPublicationStatusService.getFailedActivationError).toHaveBeenCalledWith(
					workflowId,
					nodes,
				);
			});

			it('returns null when neither source holds an error', async () => {
				workflowPublicationStatusService.getFailedActivationError.mockResolvedValue(null);
				activationErrorsService.get.mockResolvedValue(null);

				expect(await service.getActivationError(workflowId, user)).toBeNull();
			});
		});
	});
});
