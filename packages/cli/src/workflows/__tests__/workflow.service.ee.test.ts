import type {
	CredentialsEntity,
	CredentialsRepository,
	FolderRepository,
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
import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowMutationHooksProxy } from '@/workflows/workflow-mutation-hooks-proxy.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

const flags = { credSharingEnabled: false };
vi.mock('@/constants/credential-sharing', () => ({
	isCredSharingEnabled: () => flags.credSharingEnabled,
}));

describe('EnterpriseWorkflowService', () => {
	let service: EnterpriseWorkflowService;
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const workflowPublishHistoryRepository = mock<WorkflowPublishHistoryRepository>();
	const workflowMutationHooks = mock<WorkflowMutationHooksProxy>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const projectService = mock<ProjectService>();
	const folderRepository = mock<FolderRepository>();
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const ownershipService = mock<OwnershipService>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();

	beforeEach(() => {
		vi.clearAllMocks();
		flags.credSharingEnabled = false;
		service = new EnterpriseWorkflowService(
			mock(), // logger
			mock(), // sharedWorkflowRepository
			workflowRepository,
			credentialsRepository,
			credentialsService,
			ownershipService,
			projectService,
			activeWorkflowManager,
			credentialsFinderService,
			mock(), // enterpriseCredentialsService
			workflowFinderService,
			folderRepository,
			workflowPublishHistoryRepository,
			workflowMutationHooks,
			policyEnforcementService,
			credentialsPermissionChecker,
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

	describe('addCredentialsToWorkflow()', () => {
		const user = mock<User>({ id: 'user-1' });

		const buildWorkflow = () =>
			mock<Parameters<EnterpriseWorkflowService['addCredentialsToWorkflow']>[0]>({
				id: 'workflow-1',
				nodes: [{ credentials: { googlePalmApi: { id: 'cred-1', name: 'Google' } } }],
				usedCredentials: undefined,
			});

		beforeEach(() => {
			credentialsRepository.getManyByIds.mockResolvedValue([
				mock<CredentialsEntity>({ id: 'cred-1', name: 'Google', type: 'googlePalmApi' }),
			]);
			ownershipService.addOwnedByAndSharedWith.mockImplementation((entity) =>
				Object.assign(entity, { homeProject: null, sharedWithProjects: [] }),
			);
		});

		it('describes every referenced credential regardless of access', async () => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(workflow.usedCredentials).toMatchObject([
				{ id: 'cred-1', name: 'Google', type: 'googlePalmApi', currentUserCanUse: false },
			]);
		});

		it('when the flag is off, asks the project-scoped check', async () => {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				mock({ id: 'cred-1' }),
			]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
				workflowId: 'workflow-1',
			});
			expect(credentialsPermissionChecker.findUnusableInWorkflow).not.toHaveBeenCalled();
			expect(workflow.usedCredentials).toMatchObject([{ id: 'cred-1', currentUserCanUse: true }]);
		});

		it('when the flag is on, asks the rule a run acting as the user follows', async () => {
			flags.credSharingEnabled = true;
			credentialsPermissionChecker.findUnusableInWorkflow.mockResolvedValue([]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(credentialsPermissionChecker.findUnusableInWorkflow).toHaveBeenCalledWith(
				'workflow-1',
				['cred-1'],
				user.id,
			);
			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
			expect(workflow.usedCredentials).toMatchObject([{ id: 'cred-1', currentUserCanUse: true }]);
		});

		it('when the flag is on, a credential that rule rejects is unusable', async () => {
			flags.credSharingEnabled = true;
			credentialsPermissionChecker.findUnusableInWorkflow.mockResolvedValue([
				{ id: 'cred-1', name: 'Google', exists: true, ownerProject: null },
			]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(workflow.usedCredentials).toMatchObject([{ id: 'cred-1', currentUserCanUse: false }]);
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

	describe('validateWorkflowCredentialUsage() - credential added to an existing node', () => {
		const httpNode = (
			credentials?: INode['credentials'],
			parameters: Record<string, unknown> = { url: '' },
		) =>
			({
				id: 'existing-1',
				name: 'Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters,
				...(credentials ? { credentials } : {}),
			}) as unknown as INode;
		const accessible = [{ id: 'team-cred' }];

		it('rejects a credential the user cannot use when the node did not have it before', () => {
			const previousVersion = { nodes: [httpNode()] } as unknown as IWorkflowBase;
			const newVersion = {
				nodes: [
					httpNode(
						{ httpHeaderAuth: { id: 'personal-cred', name: 'Mine' } },
						{ url: 'https://x.test' },
					),
				],
			} as unknown as IWorkflowBase;

			expect(() =>
				service.validateWorkflowCredentialUsage(newVersion, previousVersion, accessible),
			).toThrow(/credentials in the 'Call' node/);
		});

		it('saves a credential the user can use together with the other edits', () => {
			const previousVersion = { nodes: [httpNode()] } as unknown as IWorkflowBase;
			const edited = httpNode(
				{ httpHeaderAuth: { id: 'team-cred', name: 'Team' } },
				{ url: 'https://x.test', query: { key: 'value' } },
			);
			const newVersion = { nodes: [edited] } as unknown as IWorkflowBase;

			const result = service.validateWorkflowCredentialUsage(
				newVersion,
				previousVersion,
				accessible,
			);

			expect(result.nodes[0]).toEqual(edited);
		});

		it('still restores a node whose credential the user could not use before', () => {
			const previous = httpNode({ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } });
			const previousVersion = { nodes: [previous] } as unknown as IWorkflowBase;
			const newVersion = {
				nodes: [{ ...previous, parameters: { url: 'https://changed.test' } }],
			} as unknown as IWorkflowBase;

			const result = service.validateWorkflowCredentialUsage(
				newVersion,
				previousVersion,
				accessible,
			);

			expect(result.nodes[0].parameters).toEqual({ url: '' });
		});

		it('restores a read-only node whose credential is swapped for another the user cannot use', () => {
			const previous = httpNode({ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } });
			const previousVersion = { nodes: [previous] } as unknown as IWorkflowBase;
			const newVersion = {
				nodes: [
					httpNode(
						{ httpHeaderAuth: { id: 'other-foreign-cred', name: 'Fake' } },
						{ url: 'https://changed.test' },
					),
				],
			} as unknown as IWorkflowBase;

			const result = service.validateWorkflowCredentialUsage(
				newVersion,
				previousVersion,
				accessible,
			);

			expect(result.nodes[0]).toEqual(previous);
		});

		it('saves a read-only node switched to a credential the user can use, with its other edits', () => {
			const previous = httpNode({ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } });
			const previousVersion = { nodes: [previous] } as unknown as IWorkflowBase;
			const switched = httpNode(
				{ httpHeaderAuth: { id: 'team-cred', name: 'Team' } },
				{ url: 'https://changed.test' },
			);
			const newVersion = { nodes: [switched] } as unknown as IWorkflowBase;

			const result = service.validateWorkflowCredentialUsage(
				newVersion,
				previousVersion,
				accessible,
			);

			expect(result.nodes[0]).toEqual(switched);
		});

		it('restores a read-only node whose unresolved credential is replaced', () => {
			const previous = httpNode({ httpHeaderAuth: { id: null, name: 'Old' } });
			const previousVersion = { nodes: [previous] } as unknown as IWorkflowBase;
			const newVersion = {
				nodes: [httpNode({ httpHeaderAuth: { id: null, name: 'New' } }, { url: 'https://x.test' })],
			} as unknown as IWorkflowBase;

			const result = service.validateWorkflowCredentialUsage(
				newVersion,
				previousVersion,
				accessible,
			);

			expect(result.nodes[0]).toEqual(previous);
		});
	});

	describe('validateWorkflowCredentialUsage() - agent node parameters', () => {
		// The agent node keeps its credential references in the hidden
		// `inlineAgent` parameter, not in `node.credentials`.
		const agentNode = (id: string, inlineAgent: unknown) =>
			({
				id,
				name: id,
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 2,
				position: [0, 0],
				parameters: { agentSource: 'inline', inlineAgent },
			}) as unknown as INode;

		const withModelCredential = (credential: string) => ({ config: { credential } });

		const withToolCredential = (id: string) => ({
			config: {
				credential: 'cred-editor',
				tools: [
					{
						type: 'node',
						node: {
							nodeType: 'n8n-nodes-base.httpRequest',
							credentials: { httpBearerAuth: { id, name: 'Token' } },
						},
					},
				],
			},
		});

		const save = (
			newNodes: INode[],
			previousNodes: INode[] = [],
			allowed: string[] = ['cred-editor'],
		) =>
			service.validateWorkflowCredentialUsage(
				{ nodes: newNodes } as unknown as IWorkflowBase,
				{ nodes: previousNodes } as unknown as IWorkflowBase,
				allowed.map((id) => mock<CredentialsEntity>({ id })),
			);

		it.each([
			['the model credential', withModelCredential('cred-other')],
			['a node tool credential', withToolCredential('cred-other')],
			['a JSON-encoded parameter', JSON.stringify(withModelCredential('cred-other'))],
			[
				'a node tool sub-workflow',
				{
					config: {
						credential: 'cred-editor',
						tools: [
							{
								type: 'node',
								node: {
									nodeType: 'n8n-nodes-base.executeWorkflow',
									nodeParameters: {
										source: 'parameter',
										workflowJson: JSON.stringify({
											nodes: [{ credentials: { httpHeaderAuth: { id: 'cred-other', name: 'x' } } }],
											connections: {},
										}),
									},
								},
							},
						],
					},
				},
			],
			[
				'a node tool that is another agent, as JSON text',
				{
					config: {
						credential: 'cred-editor',
						tools: [
							{
								type: 'node',
								node: {
									nodeType: 'n8n-nodes-base.messageAnAgentTool',
									nodeParameters: {
										agentSource: 'inline',
										inlineAgent: JSON.stringify({ config: { credential: 'cred-other' } }),
									},
								},
							},
						],
					},
				},
			],
		])('rejects a new agent node that names a credential in %s', (_label, inlineAgent) => {
			expect(() => save([agentNode('new-agent', inlineAgent)])).toThrow();
		});

		it('restores the stored agent node when the user cannot use its credential', () => {
			const stored = agentNode('agent-1', withModelCredential('cred-other'));
			const edited = agentNode('agent-1', {
				config: { credential: 'cred-other', instructions: 'Summarize the input.' },
			});

			const result = save([edited], [stored]);

			expect(result.nodes[0].parameters).toEqual(stored.parameters);
		});

		it('accepts an agent node whose credentials the user can use', () => {
			expect(() => save([agentNode('new-agent', withToolCredential('cred-editor'))])).not.toThrow();
		});

		it('accepts a parameter value that is not valid JSON', () => {
			expect(() => save([agentNode('new-agent', '{ not json')])).not.toThrow();
		});

		it('ignores a `credentialId` parameter of a node tool, which names a remote credential', () => {
			const remoteReference = {
				config: {
					credential: 'cred-editor',
					tools: [
						{
							type: 'node',
							node: {
								nodeType: 'n8n-nodes-base.n8n',
								nodeParameters: {
									resource: 'credential',
									operation: 'delete',
									credentialId: 'remote-id',
								},
							},
						},
					],
				},
			};

			expect(() => save([agentNode('new-agent', remoteReference)])).not.toThrow();
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

	describe('transferWorkflow()', () => {
		const user = mock<User>({ id: 'user-1' });
		const sourceProject = mock<Project>({ id: 'proj-source' });
		const destinationProject = mock<Project>({ id: 'proj-dest' });

		const makeWorkflow = (overrides: Partial<WorkflowEntity> = {}) =>
			mock<WorkflowEntity>({
				id: 'wf-1',
				name: 'My workflow',
				nodes: [],
				activeVersionId: null,
				parentFolder: null,
				shared: [mock<SharedWorkflow>({ role: 'workflow:owner', project: sourceProject })],
				...overrides,
			});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let transferOwnershipSpy: ReturnType<typeof vi.spyOn<any, any>>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let shareCredentialsSpy: ReturnType<typeof vi.spyOn<any, any>>;

		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflow());
			projectService.getProjectWithScope.mockResolvedValue(destinationProject);
			policyEnforcementService.enforceWorkflowTransfer.mockResolvedValue(mock());
			// Ownership transfer and credential sharing are exercised by their own
			// describe blocks below; stubbed here so these tests isolate the
			// policy-enforcement wiring in `transferWorkflow` itself.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			transferOwnershipSpy = vi
				.spyOn(service as any, 'transferWorkflowOwnership')
				.mockResolvedValue(undefined);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			shareCredentialsSpy = vi
				.spyOn(service as any, 'shareCredentialsWithProject')
				.mockResolvedValue(undefined);
		});

		it('calls enforceWorkflowTransfer with the target project, not the source', async () => {
			const workflow = makeWorkflow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);

			await service.transferWorkflow(user, 'wf-1', 'proj-dest');

			expect(policyEnforcementService.enforceWorkflowTransfer).toHaveBeenCalledExactlyOnceWith(
				{
					workflow,
					targetProjectId: destinationProject.id,
				},
				{ kind: 'user', user },
			);
		});

		it('proceeds with the transfer unchanged when the policy check clears', async () => {
			await service.transferWorkflow(user, 'wf-1', 'proj-dest');

			expect(transferOwnershipSpy).toHaveBeenCalledTimes(1);
			expect(shareCredentialsSpy).toHaveBeenCalledTimes(1);
			expect(workflowRepository.update).toHaveBeenCalledWith(
				{ id: 'wf-1' },
				{ parentFolder: null },
			);
		});

		it('blocks the transfer and performs no mutation when the policy check throws', async () => {
			const violation = new Error('blocked by policy');
			policyEnforcementService.enforceWorkflowTransfer.mockRejectedValue(violation);

			await expect(service.transferWorkflow(user, 'wf-1', 'proj-dest')).rejects.toThrow(violation);

			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(transferOwnershipSpy).not.toHaveBeenCalled();
			expect(shareCredentialsSpy).not.toHaveBeenCalled();
			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		it('resolves the destination project before enforcing the policy check', async () => {
			const callOrder: string[] = [];
			projectService.getProjectWithScope.mockImplementation(async () => {
				callOrder.push('getProjectWithScope');
				return destinationProject;
			});
			policyEnforcementService.enforceWorkflowTransfer.mockImplementation(async () => {
				callOrder.push('enforceWorkflowTransfer');
				return await mock();
			});

			await service.transferWorkflow(user, 'wf-1', 'proj-dest');

			expect(callOrder).toEqual(['getProjectWithScope', 'enforceWorkflowTransfer']);
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
