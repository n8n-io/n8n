import type {
	CredentialsEntity,
	Project,
	SharedWorkflow,
	User,
	WorkflowEntity,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { EntityManager, UpdateResult } from '@n8n/typeorm';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { WorkflowActivationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

describe('EnterpriseWorkflowService', () => {
	let service: EnterpriseWorkflowService;
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const workflowPublishHistoryRepository = mock<WorkflowPublishHistoryRepository>();
	const workflowMutationHooks = mock<WorkflowMutationHooksProxy>();

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
			mock(), // folderRepository
			workflowPublishHistoryRepository,
			workflowMutationHooks,
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

		it('should inspect credentials referenced inside an inline sub-workflow', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: {
							source: 'parameter',
							workflowJson: JSON.stringify({
								nodes: [{ credentials: { spotifyApi: { id: 'cred-unknown', name: 'x' } } }],
								connections: {},
							}),
						},
					},
				],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should pass when an inline sub-workflow credential is in the allowed list', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: {
							source: 'parameter',
							workflowJson: JSON.stringify({
								nodes: [{ credentials: { spotifyApi: { id: 'cred-1', name: 'x' } } }],
								connections: {},
							}),
						},
					},
				],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).not.toThrow();
		});

		it('should reject a non-managed credential with a null id (name-only reference)', () => {
			// Built as a real object: mock<IWorkflowBase> strips an explicit null id.
			const workflow = {
				nodes: [{ credentials: { spotifyApi: { id: null, name: 'Someone else prod' } } }],
			} as unknown as IWorkflowBase;

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should reject a non-managed credential with an empty-string id', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [{ credentials: { spotifyApi: { id: '', name: 'Someone else prod' } } }],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should reject a null-id credential hidden inside an inline sub-workflow', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: {
							source: 'parameter',
							workflowJson: JSON.stringify({
								nodes: [{ credentials: { spotifyApi: { id: null, name: 'Someone else prod' } } }],
								connections: {},
							}),
						},
					},
				],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});

		it('should inspect credentials nested in a deeper inline sub-workflow', () => {
			const inner = JSON.stringify({
				nodes: [{ credentials: { spotifyApi: { id: 'cred-unknown', name: 'x' } } }],
				connections: {},
			});
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: {
							source: 'parameter',
							workflowJson: JSON.stringify({
								nodes: [
									{ type: 'n8n-nodes-base.executeWorkflow', parameters: { workflowJson: inner } },
								],
								connections: {},
							}),
						},
					},
				],
			});

			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [
					mock<CredentialsEntity>({ id: 'cred-1' }),
				]),
			).toThrow();
		});
	});

	describe('validateWorkflowCredentialUsage() - unresolved credentials', () => {
		// Real objects, not mock<IWorkflowBase>, so the explicit null id survives.
		const nodeWithNullCred = (id: string, name: string) =>
			({
				id,
				name,
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters: {},
				credentials: { httpHeaderAuth: { id: null, name: 'some name' } },
			}) as unknown as INode;

		it('rejects a new node carrying an unresolved (name-only) credential as tampering', () => {
			const newVersion = {
				nodes: [nodeWithNullCred('new-1', 'Steal')],
			} as unknown as IWorkflowBase;
			const previousVersion = { nodes: [] } as unknown as IWorkflowBase;

			expect(() =>
				service.validateWorkflowCredentialUsage(newVersion, previousVersion, []),
			).toThrow();
		});

		it('rejects an unresolved credential smuggled into a new inline sub-workflow node', () => {
			const inlineNode = {
				id: 'new-inline',
				name: 'Sub',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: {
					source: 'parameter',
					workflowJson: JSON.stringify({
						nodes: [{ credentials: { httpHeaderAuth: { id: null, name: 'y' } } }],
						connections: {},
					}),
				},
			} as unknown as INode;
			const newVersion = { nodes: [inlineNode] } as unknown as IWorkflowBase;
			const previousVersion = { nodes: [] } as unknown as IWorkflowBase;

			expect(() =>
				service.validateWorkflowCredentialUsage(newVersion, previousVersion, []),
			).toThrow();
		});

		it('keeps an unresolved credential on a pre-existing (read-only) node without throwing', () => {
			const existing = nodeWithNullCred('existing-1', 'Call');
			const newVersion = {
				nodes: [{ ...existing, name: 'Renamed' }],
			} as unknown as IWorkflowBase;
			const previousVersion = { nodes: [existing] } as unknown as IWorkflowBase;

			expect(() =>
				service.validateWorkflowCredentialUsage(newVersion, previousVersion, []),
			).not.toThrow();
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

	describe('transferWorkflowOwnership', () => {
		const destinationProject = mock<Project>({ id: 'proj-dest' });

		const makeWorkflow = (id: string, ownerProjectId: string) =>
			mock<WorkflowEntity>({
				id,
				shared: [
					mock<SharedWorkflow>({
						role: 'workflow:owner',
						project: mock<Project>({ id: ownerProjectId }),
					}),
				],
			});

		beforeEach(() => {
			const entityManager = mock<EntityManager>();
			entityManager.transaction.mockImplementation(
				// @ts-expect-error transaction() has multiple overloads; tests use the single-callback one
				async (cb: (trx: EntityManager) => Promise<void>) => await cb(mock<EntityManager>()),
			);
			Object.defineProperty(workflowRepository, 'manager', {
				value: entityManager,
				configurable: true,
			});
		});

		it('notifies the mutation hook only for workflows whose owning project changed', async () => {
			const moved = makeWorkflow('wf-moved', 'proj-source');
			const folderMoveOnly = makeWorkflow('wf-same-project', 'proj-dest');

			await service['transferWorkflowOwnership'](
				mock<User>({ id: 'user-1' }),
				[moved, folderMoveOnly],
				destinationProject,
			);

			expect(workflowMutationHooks.afterWorkflowsTransferred).toHaveBeenCalledExactlyOnceWith(
				['wf-moved'],
				'user-1',
			);
		});

		it('does not notify the mutation hook for a same-project folder move', async () => {
			const folderMoveOnly = makeWorkflow('wf-same-project', 'proj-dest');

			await service['transferWorkflowOwnership'](
				mock<User>(),
				[folderMoveOnly],
				destinationProject,
			);

			expect(workflowMutationHooks.afterWorkflowsTransferred).not.toHaveBeenCalled();
		});
	});
});
