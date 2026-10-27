import {
	OwnershipTransferHandlerRegistry,
	type ProjectOwnershipTransferHandler,
} from '@n8n/backend-services';
import type {
	CredentialsEntity,
	SharedCredentialsRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { FolderService } from '@/services/folder.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { OwnershipTransferService } from '../ownership-transfer.service';

describe('OwnershipTransferService', () => {
	const trx = mock<EntityManager>();
	const manager = mock<EntityManager>();
	const userRepository = mock<UserRepository>({ manager });
	const workflowService = mock<WorkflowService>();
	const credentialsService = mock<CredentialsService>();
	const folderService = mock<FolderService>();
	const ownershipService = mock<OwnershipService>();
	const handler = mock<ProjectOwnershipTransferHandler<EntityManager>>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const policyEnforcementService = mock<PolicyEnforcementService>();

	let service: OwnershipTransferService;

	beforeEach(() => {
		vi.clearAllMocks();
		manager.transaction.mockImplementation(
			async (runInTransaction: unknown) =>
				await (runInTransaction as (trx: EntityManager) => Promise<unknown>)(trx),
		);
		workflowService.transferAll.mockResolvedValue([]);

		const transferHandlers = new OwnershipTransferHandlerRegistry<EntityManager>();
		transferHandlers.register(handler);

		service = new OwnershipTransferService(
			userRepository,
			workflowService,
			credentialsService,
			folderService,
			ownershipService,
			transferHandlers,
			sharedWorkflowRepository,
			workflowRepository,
			sharedCredentialsRepository,
			policyEnforcementService,
		);
	});

	describe('enforceTransferPolicy', () => {
		const actor: PolicyActor = { kind: 'user', user: { id: 'user-1' } };
		const workflows = [
			mock<WorkflowEntity>({ id: 'wf-1', name: 'One', nodes: [] }),
			mock<WorkflowEntity>({ id: 'wf-2', name: 'Two', nodes: [] }),
		];
		const credentials = [mock<CredentialsEntity>({ id: 'cred-1', type: 'slackApi' })];

		beforeEach(() => {
			policyEnforcementService.hasChecksFor.mockReturnValue(true);
			sharedWorkflowRepository.find.mockResolvedValue([
				mock<SharedWorkflow>({ workflowId: 'wf-1' }),
				mock<SharedWorkflow>({ workflowId: 'wf-2' }),
			]);
			workflowRepository.findByIds.mockResolvedValue(workflows);
			sharedCredentialsRepository.findOwnedCredentialsByProjects.mockResolvedValue(credentials);
			policyEnforcementService.enforceWorkflowTransfer.mockResolvedValue(mock());
			policyEnforcementService.enforceCredentialTransfer.mockResolvedValue(mock());
		});

		it('checks every owned workflow and credential against the destination project', async () => {
			await service.enforceTransferPolicy('from', 'to', actor);

			expect(sharedWorkflowRepository.find).toHaveBeenCalledWith({
				select: { workflowId: true },
				where: { projectId: 'from', role: 'workflow:owner' },
			});
			expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf-1', 'wf-2'], {
				fields: ['name', 'nodes'],
			});
			expect(sharedCredentialsRepository.findOwnedCredentialsByProjects).toHaveBeenCalledWith([
				'from',
			]);
			for (const workflow of workflows) {
				expect(policyEnforcementService.enforceWorkflowTransfer).toHaveBeenCalledWith(
					{ workflow, targetProjectId: 'to' },
					actor,
				);
			}
			expect(policyEnforcementService.enforceCredentialTransfer).toHaveBeenCalledExactlyOnceWith(
				{ credential: { id: 'cred-1', type: 'slackApi' }, targetProjectId: 'to' },
				actor,
			);
			expect(manager.transaction).not.toHaveBeenCalled();
		});

		it('propagates the first violation and checks nothing after it', async () => {
			const violation = new Error('blocked by policy');
			policyEnforcementService.enforceWorkflowTransfer.mockRejectedValueOnce(violation);

			await expect(service.enforceTransferPolicy('from', 'to', actor)).rejects.toThrow(violation);

			expect(policyEnforcementService.enforceWorkflowTransfer).toHaveBeenCalledTimes(1);
			expect(policyEnforcementService.enforceCredentialTransfer).not.toHaveBeenCalled();
		});

		it('loads nothing when no check is registered for either point', async () => {
			policyEnforcementService.hasChecksFor.mockReturnValue(false);

			await service.enforceTransferPolicy('from', 'to', actor);

			expect(sharedWorkflowRepository.find).not.toHaveBeenCalled();
			expect(workflowRepository.findByIds).not.toHaveBeenCalled();
			expect(sharedCredentialsRepository.findOwnedCredentialsByProjects).not.toHaveBeenCalled();
			expect(policyEnforcementService.enforceWorkflowTransfer).not.toHaveBeenCalled();
			expect(policyEnforcementService.enforceCredentialTransfer).not.toHaveBeenCalled();
		});
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

	describe('deleteUserOwnedModuleResources', () => {
		it('runs the user-keyed delete of every handler that has one, for each user', async () => {
			const userHandler = mock<ProjectOwnershipTransferHandler<EntityManager>>();
			// A handler without the optional method, like the data-table handler.
			const projectOnlyHandler: ProjectOwnershipTransferHandler<EntityManager> = {
				resource: 'project-only',
				transferAll: vi.fn(),
				deleteAll: vi.fn(),
			};
			const transferHandlers = new OwnershipTransferHandlerRegistry<EntityManager>();
			transferHandlers.register(projectOnlyHandler);
			transferHandlers.register(userHandler);
			service = new OwnershipTransferService(
				userRepository,
				workflowService,
				credentialsService,
				folderService,
				ownershipService,
				transferHandlers,
				sharedWorkflowRepository,
				workflowRepository,
				sharedCredentialsRepository,
				policyEnforcementService,
			);

			await service.deleteUserOwnedModuleResources(['u-1', 'u-2']);

			expect(userHandler.deleteAllForUser).toHaveBeenCalledWith('u-1');
			expect(userHandler.deleteAllForUser).toHaveBeenCalledWith('u-2');
			expect(projectOnlyHandler.deleteAll).not.toHaveBeenCalled();
			expect(projectOnlyHandler.transferAll).not.toHaveBeenCalled();
			expect(userHandler.deleteAll).not.toHaveBeenCalled();
			expect(manager.transaction).not.toHaveBeenCalled();
		});
	});
});
