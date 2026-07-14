import type {
	CredentialsEntity,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { UpdateResult } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';
import { WorkflowActivationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

describe('EnterpriseWorkflowService', () => {
	let service: EnterpriseWorkflowService;
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const workflowPublishHistoryRepository = mock<WorkflowPublishHistoryRepository>();

	beforeEach(() => {
		vi.clearAllMocks();
		service = new EnterpriseWorkflowService(
			mock(), // logger
			mock(), // sharedWorkflowRepository
			workflowRepository,
			mock(), // credentialsRepository
			mock(), // credentialsService
			mock(), // ownershipService
			mock(), // projectService
			activeWorkflowManager,
			mock(), // credentialsFinderService
			mock(), // enterpriseCredentialsService
			mock(), // workflowFinderService
			mock(), // folderService
			mock(), // folderRepository
			workflowPublishHistoryRepository,
		);
	});

	describe('validateCredentialPermissionsToUser()', () => {
		it('should pass when all credentials are in the allowed list', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [{ credentials: { googlePalmApi: { id: 'cred-1', name: 'Google' } } }],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).not.toThrow();
		});

		it('should throw when a credential id is not in the allowed list', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [{ credentials: { googlePalmApi: { id: 'cred-unknown', name: 'Google' } } }],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should skip __aiGatewayManaged credentials with null id', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).not.toThrow();
		});

		it('should still validate __aiGatewayManaged credentials that have a real id', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: 'cred-unknown', name: '', __aiGatewayManaged: true },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).toThrow();
		});

		it('should validate non-gateway credentials even when a gateway credential is also present', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						credentials: {
							googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
							openAiApi: { id: 'cred-unknown', name: 'OpenAI' },
						},
					},
				],
			});

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).toThrow();
		});

		it('should skip nodes with no credentials', () => {
			const workflow = mock<IWorkflowBase>({ nodes: [{ credentials: undefined }] });

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).not.toThrow();
		});
	});

	describe('attemptWorkflowReactivation', () => {
		// Workflow and folder transfers deactivate, transfer, then re-add. A failed
		// re-add may have partially registered triggers, in memory and as durable
		// schedule jobs; they must be torn down before the workflow is flagged
		// inactive, or they keep firing an inactive workflow.
		it('should tear down triggers before marking the workflow inactive when reactivation fails', async () => {
			const callOrder: string[] = [];
			activeWorkflowManager.add.mockRejectedValue(new WorkflowActivationError('broken credential'));
			activeWorkflowManager.remove.mockImplementation(async () => {
				callOrder.push('remove');
			});
			workflowRepository.updateActiveState.mockImplementation(async () => {
				callOrder.push('updateActiveState');
				return {} as UpdateResult;
			});

			const result = await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(callOrder).toEqual(['remove', 'updateActiveState']);
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('wf-1');
			expect(workflowRepository.updateActiveState).toHaveBeenCalledWith('wf-1', false);
			expect(workflowPublishHistoryRepository.addRecord).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				versionId: 'version-1',
				event: 'deactivated',
				userId: 'user-1',
			});
			expect(result).toEqual({
				error: expect.objectContaining({ message: 'broken credential' }),
			});
		});

		it('should still deactivate the workflow when the trigger teardown fails', async () => {
			activeWorkflowManager.add.mockRejectedValue(new WorkflowActivationError('broken credential'));
			activeWorkflowManager.remove.mockRejectedValue(new Error('teardown failed'));

			await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(workflowRepository.updateActiveState).toHaveBeenCalledWith('wf-1', false);
		});

		it('should not touch triggers or the active flag when reactivation succeeds', async () => {
			activeWorkflowManager.add.mockResolvedValue({ webhooks: true, triggersAndPollers: true });

			const result = await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(result).toBeUndefined();
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(workflowRepository.updateActiveState).not.toHaveBeenCalled();
		});
	});
});
