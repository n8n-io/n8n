import type {
	CredentialsEntity,
	CredentialsRepository,
	FolderRepository,
	Project,
	SharedWorkflow,
	User,
	WorkflowEntity,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { EntityManager, UpdateResult } from '@n8n/typeorm';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { WorkflowActivationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { CredentialsFinderService, WorkflowMutationHooksProxy } from '@n8n/backend-services';
import type { CredentialsService } from '@/credentials/credentials.service';
import { TransferWorkflowError } from '@/errors/response-errors/transfer-workflow.error';
import type { NodeTypes } from '@/node-types';
import type { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

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
	const nodeTypes = mock<NodeTypes>();
	const credentialsPermissionChecker = mock<CredentialsPermissionChecker>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();

	beforeEach(() => {
		vi.clearAllMocks();
		nodeTypes.getByNameAndVersion.mockReset();
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
			nodeTypes,
			credentialsPermissionChecker,
			workflowHistoryRepository,
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

		it('asks the rule a run acting as the user follows', async () => {
			credentialsPermissionChecker.findUnusableInWorkflow.mockResolvedValue([]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(credentialsPermissionChecker.findUnusableInWorkflow).toHaveBeenCalledWith(
				'workflow-1',
				['cred-1'],
				user.id,
			);
			expect(workflow.usedCredentials).toMatchObject([{ id: 'cred-1', currentUserCanUse: true }]);
		});

		it('describes a credential that rule rejects, and marks it unusable', async () => {
			credentialsPermissionChecker.findUnusableInWorkflow.mockResolvedValue([
				{ id: 'cred-1', name: 'Google', exists: true, ownerProject: null },
			]);
			const workflow = buildWorkflow();

			await service.addCredentialsToWorkflow(workflow, user);

			expect(workflow.usedCredentials).toMatchObject([
				{ id: 'cred-1', name: 'Google', type: 'googlePalmApi', currentUserCanUse: false },
			]);
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

	describe('validateWorkflowCredentialUsage() - sub-workflow source', () => {
		const URL_SOURCE = { source: 'url', workflowUrl: 'https://example.com/workflow.json' };
		const subworkflowNode = (parameters: Record<string, unknown>, overrides: Partial<INode> = {}) =>
			({
				id: 'sub-1',
				name: 'Sub',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: [0, 0],
				parameters,
				...overrides,
			}) as unknown as INode;
		const save = (
			newNodes: INode[],
			previousNodes: INode[] = [],
			options?: { allowUninspectableSource?: boolean },
		) =>
			service.validateWorkflowCredentialUsage(
				{ nodes: newNodes } as unknown as IWorkflowBase,
				{ nodes: previousNodes } as unknown as IWorkflowBase,
				[],
				[],
				options,
			);

		it.each([
			['"url"', URL_SOURCE],
			['"localFile"', { source: 'localFile', workflowPath: '/data/workflow.json' }],
			['an expression', { source: '={{ $json.source }}' }],
			['not a string', { source: 42 }],
		])('rejects a new Execute Sub-workflow node whose source is %s', (_label, parameters) => {
			expect(() => save([subworkflowNode(parameters)])).toThrow(/cannot be checked/);
		});

		it.each([
			['absent', {}],
			['"database"', { source: 'database', workflowId: { __rl: true, value: 'wf-1', mode: 'id' } }],
			[
				'"parameter"',
				{ source: 'parameter', workflowJson: JSON.stringify({ nodes: [], connections: {} }) },
			],
		])('accepts a new Execute Sub-workflow node whose source is %s', (_label, parameters) => {
			expect(() => save([subworkflowNode(parameters)])).not.toThrow();
		});

		it('rejects a Workflow Tool node whose source is neither "database" nor "parameter"', () => {
			const node = subworkflowNode(URL_SOURCE, {
				type: '@n8n/n8n-nodes-langchain.toolWorkflow',
				typeVersion: 2,
			});
			expect(() => save([node])).toThrow(/cannot be checked/);
		});

		it('rejects the synthetic HITL tool variant of a url-sourced Execute Sub-workflow node', () => {
			const node = subworkflowNode(URL_SOURCE, { type: 'n8n-nodes-base.executeWorkflowHitlTool' });
			expect(() => save([node])).toThrow(/cannot be checked/);
		});

		it('rejects a url-sourced node nested inside an inline sub-workflow', () => {
			const inner = subworkflowNode(URL_SOURCE, { id: 'inner', name: 'Inner' });
			const outer = subworkflowNode({
				source: 'parameter',
				workflowJson: JSON.stringify({ nodes: [inner], connections: {} }),
			});
			expect(() => save([outer])).toThrow(/cannot be checked/);
		});

		it('rejects a url-sourced Execute Sub-workflow tool inside an inline agent parameter', () => {
			const agent = {
				id: 'agent-1',
				name: 'Agent',
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 2,
				position: [0, 0],
				parameters: {
					agentSource: 'inline',
					inlineAgent: {
						config: {
							tools: [
								{ nodeType: 'n8n-nodes-base.executeWorkflowTool', nodeParameters: URL_SOURCE },
							],
						},
					},
				},
			} as unknown as INode;
			expect(() => save([agent])).toThrow(/cannot be checked/);
		});

		it('rejects an existing editable node that is changed to a url source', () => {
			const previous = subworkflowNode({ source: 'database', workflowId: 'wf-1' });
			expect(() => save([subworkflowNode(URL_SOURCE)], [previous])).toThrow(/cannot be checked/);
		});

		it('allows renaming, moving and disabling a stored URL node', () => {
			const previous = subworkflowNode(URL_SOURCE);
			const edited = { ...previous, name: 'Renamed', position: [10, 10], disabled: true } as INode;

			const result = save([edited], [previous]);

			expect(result.nodes[0]).toEqual(edited);
		});

		it('rejects URL changes when the node description is unavailable', () => {
			const previous = subworkflowNode(URL_SOURCE);
			const changed = subworkflowNode({
				source: 'url',
				workflowUrl: 'https://example.com/other.json',
			});
			expect(() => save([changed], [previous])).toThrow(/cannot be checked/);
		});

		it('rejects retry setting changes on a stored URL node', () => {
			const previous = subworkflowNode(URL_SOURCE);
			const changed = { ...previous, retryOnFail: true } as INode;
			expect(() => save([changed], [previous])).toThrow(/cannot be checked/);
		});

		describe('with the node type description available', () => {
			beforeEach(() => {
				nodeTypes.getByNameAndVersion.mockReturnValue({
					description: {
						properties: [
							{ displayName: 'Source', name: 'source', type: 'options', default: 'database' },
							{
								displayName: 'Workflow',
								name: 'workflowId',
								type: 'string',
								default: '',
								displayOptions: { show: { source: ['database'] } },
							},
							{
								displayName: 'URL',
								name: 'workflowUrl',
								type: 'string',
								default: '',
								displayOptions: { show: { source: ['url'] } },
							},
							{ displayName: 'Mode', name: 'mode', type: 'options', default: 'once' },
						],
					},
				} as never);
			});

			it('accepts omitted parameter defaults', () => {
				// A node stored through the API may carry a default the editor strips on save.
				const stored = subworkflowNode({ ...URL_SOURCE, mode: 'once' });
				const fromEditor = { ...subworkflowNode(URL_SOURCE), name: 'Renamed' } as INode;

				const result = save([fromEditor], [stored]);

				expect(result.nodes[0]).toEqual({ ...stored, name: 'Renamed' });
			});

			it('accepts omitted hidden parameters', () => {
				// The editor drops the old database workflow ID when the source is URL.
				const stored = subworkflowNode({ ...URL_SOURCE, workflowId: 'old-workflow' });
				const fromEditor = { ...subworkflowNode(URL_SOURCE), name: 'Renamed' } as INode;

				const result = save([fromEditor], [stored]);

				expect(result.nodes[0]).toEqual({ ...stored, name: 'Renamed' });
			});

			it('rejects URL changes after parameter normalization', () => {
				const stored = subworkflowNode({ ...URL_SOURCE, mode: 'once' });
				const changed = subworkflowNode({
					source: 'url',
					workflowUrl: 'https://example.com/other.json',
				});

				expect(() => save([changed], [stored])).toThrow(/cannot be checked/);
			});
		});

		it('accepts url-sourced nodes when the caller allows uninspectable sources', () => {
			const previous = subworkflowNode(URL_SOURCE);
			const changed = subworkflowNode({
				source: 'url',
				workflowUrl: 'https://example.com/other.json',
			});
			const options = { allowUninspectableSource: true };

			expect(() => save([subworkflowNode(URL_SOURCE)], [], options)).not.toThrow();
			expect(save([changed], [previous], options).nodes[0]).toEqual(changed);
		});

		it('checks source permissions when validating a new workflow', () => {
			const workflow = { nodes: [subworkflowNode(URL_SOURCE)] } as unknown as IWorkflowBase;

			expect(() => service.validateCredentialPermissionsToUser(workflow, [])).toThrow(
				/cannot be checked/,
			);
			expect(() =>
				service.validateCredentialPermissionsToUser(workflow, [], {
					allowUninspectableSource: true,
				}),
			).not.toThrow();
		});

		it('reports runtime-loaded sources even when there are no credential IDs', () => {
			const workflow = { nodes: [subworkflowNode(URL_SOURCE)] } as unknown as IWorkflowBase;

			expect(service.collectCredentialReferences(workflow)).toEqual({
				ids: new Set(),
				hasUnresolved: false,
				hasUninspectableSource: true,
			});
		});

		describe('workflow JSON of the "parameter" source', () => {
			const WORKFLOW_JSON = JSON.stringify({ nodes: [], connections: {} });
			const inlineNode = (workflowJson: unknown, overrides: Partial<INode> = {}) =>
				subworkflowNode({ source: 'parameter', workflowJson }, overrides);

			it.each([
				['an expression', '={{ $json.wf }}'],
				['an array holding workflow JSON', [WORKFLOW_JSON]],
				['an array holding an expression', ['={{ $json.wf }}']],
				['an object', { nodes: [], connections: {} }],
			])('rejects a new node whose workflow JSON is %s', (_label, workflowJson) => {
				expect(() => save([inlineNode(workflowJson)])).toThrow(/cannot be checked/);
			});

			it.each([
				['absent', undefined],
				['fixed JSON', WORKFLOW_JSON],
				['fixed text that is not JSON', 'not json'],
			])('accepts a new node whose workflow JSON is %s', (_label, workflowJson) => {
				expect(() => save([inlineNode(workflowJson)])).not.toThrow();
			});

			it('accepts an expression left in the workflow JSON of a "database" source', () => {
				// The node reads the workflow JSON only for the "parameter" source.
				const node = subworkflowNode({
					source: 'database',
					workflowId: 'wf-1',
					workflowJson: '={{ $json.wf }}',
				});
				expect(() => save([node])).not.toThrow();
			});

			it.each([
				['Workflow Tool', '@n8n/n8n-nodes-langchain.toolWorkflow'],
				['Workflow Retriever', '@n8n/n8n-nodes-langchain.retrieverWorkflow'],
			])('rejects a %s node whose workflow JSON is an expression', (_label, type) => {
				const node = inlineNode('={{ $json.wf }}', { type, typeVersion: 2 });
				expect(() => save([node])).toThrow(/cannot be checked/);
			});

			it('rejects an expression in the workflow JSON of a nested inline sub-workflow', () => {
				const inner = inlineNode('={{ $json.wf }}', { id: 'inner', name: 'Inner' });
				const outer = inlineNode(JSON.stringify({ nodes: [inner], connections: {} }));
				expect(() => save([outer])).toThrow(/cannot be checked/);
			});

			it('rejects a Workflow Tool inside an inline agent whose workflow JSON is an expression', () => {
				const agent = {
					id: 'agent-1',
					name: 'Agent',
					type: 'n8n-nodes-base.messageAnAgent',
					typeVersion: 2,
					position: [0, 0],
					parameters: {
						agentSource: 'inline',
						inlineAgent: {
							config: {
								tools: [
									{
										nodeType: '@n8n/n8n-nodes-langchain.toolWorkflow',
										nodeParameters: { source: 'parameter', workflowJson: "={{ $fromAI('wf') }}" },
									},
								],
							},
						},
					},
				} as unknown as INode;
				expect(() => save([agent])).toThrow(/cannot be checked/);
			});

			it('rejects a change to the expression of a stored node', () => {
				const previous = inlineNode('={{ $json.wf }}');
				expect(() => save([inlineNode('={{ $json.other }}')], [previous])).toThrow(
					/cannot be checked/,
				);
			});

			it('keeps a stored node with an expression when it is only renamed', () => {
				const previous = inlineNode('={{ $json.wf }}');
				const renamed = { ...previous, name: 'Renamed' } as INode;

				expect(save([renamed], [previous]).nodes[0]).toEqual(renamed);
			});

			it('accepts an expression when the caller allows uninspectable sources', () => {
				const options = { allowUninspectableSource: true };
				expect(() => save([inlineNode('={{ $json.wf }}')], [], options)).not.toThrow();
			});
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

		describe('a node as a history version stored it', () => {
			const historyNode = () =>
				httpNode(
					{ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } },
					{ url: 'https://v1.test' },
				);

			it('keeps a node renamed, moved and disabled since the version stored it', () => {
				const previousVersion = { nodes: [] } as unknown as IWorkflowBase;
				const edited = { ...historyNode(), name: 'Renamed', position: [10, 20], disabled: true };
				const newVersion = { nodes: [edited] } as unknown as IWorkflowBase;

				const result = service.validateWorkflowCredentialUsage(
					newVersion,
					previousVersion,
					accessible,
					[historyNode()],
				);

				expect(result.nodes[0]).toEqual(edited);
			});

			it('keeps a node exactly as the restored version stored it', () => {
				// The current version dropped the node; the user cannot use its credential.
				const previousVersion = { nodes: [] } as unknown as IWorkflowBase;
				const newVersion = { nodes: [historyNode()] } as unknown as IWorkflowBase;

				const result = service.validateWorkflowCredentialUsage(
					newVersion,
					previousVersion,
					accessible,
					[historyNode()],
				);

				expect(result.nodes[0]).toEqual(historyNode());
			});

			it('keeps it over the current read-only version of the same node', () => {
				const current = httpNode(
					{ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } },
					{ url: 'https://v2.test' },
				);
				const previousVersion = { nodes: [current] } as unknown as IWorkflowBase;
				const newVersion = { nodes: [historyNode()] } as unknown as IWorkflowBase;

				const result = service.validateWorkflowCredentialUsage(
					newVersion,
					previousVersion,
					accessible,
					[historyNode()],
				);

				expect(result.nodes[0]).toEqual(historyNode());
			});

			it('rejects a node that differs from the restored version', () => {
				const previousVersion = { nodes: [] } as unknown as IWorkflowBase;
				const changed = httpNode(
					{ httpHeaderAuth: { id: 'foreign-cred', name: 'Theirs' } },
					{ url: 'https://changed.test' },
				);
				const newVersion = { nodes: [changed] } as unknown as IWorkflowBase;

				expect(() =>
					service.validateWorkflowCredentialUsage(newVersion, previousVersion, accessible, [
						historyNode(),
					]),
				).toThrow(/credentials in the 'Call' node/);
			});

			it('rejects the same node in an ordinary save', () => {
				const previousVersion = { nodes: [] } as unknown as IWorkflowBase;
				const newVersion = { nodes: [historyNode()] } as unknown as IWorkflowBase;

				expect(() =>
					service.validateWorkflowCredentialUsage(newVersion, previousVersion, accessible),
				).toThrow(/credentials in the 'Call' node/);
			});
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

	describe('preventTampering() - a credential switched back from the workflow history', () => {
		const user = mock<User>({ id: 'bob', role: { scopes: [] } });
		const httpNode = (credentialId: string, url = 'https://v1.test') =>
			({
				id: 'node-1',
				name: 'Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters: { url },
				credentials: { httpHeaderAuth: { id: credentialId, name: credentialId } },
			}) as unknown as INode;
		const version = (versionId: string, nodes: INode[]) => ({ versionId, nodes });

		beforeEach(() => {
			workflowRepository.get.mockResolvedValue({
				nodes: [httpNode('own-cred')],
			} as unknown as WorkflowEntity);
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				mock({ id: 'own-cred' }),
			]);
		});

		it('saves a node switched back to a credential an earlier version stored, with its position', async () => {
			workflowHistoryRepository.findNewestVersionNodes.mockResolvedValue([
				version('v3', [httpNode('own-cred')]),
				version('v2', [httpNode('foreign-cred')]),
			]);
			const submitted = { ...httpNode('foreign-cred'), position: [10, 20] };

			const result = await service.preventTampering(
				{ nodes: [submitted] } as IWorkflowBase,
				'w1',
				user,
			);

			expect(result.nodes[0]).toEqual(submitted);
			expect(workflowHistoryRepository.findNewestVersionNodes).toHaveBeenCalledWith('w1', 20);
		});

		it('matches a stored node after its credential was renamed, also when disabled', async () => {
			workflowHistoryRepository.findNewestVersionNodes.mockResolvedValue([
				version('v2', [httpNode('foreign-cred')]),
			]);
			const submitted = { ...httpNode('foreign-cred'), disabled: true };
			submitted.credentials!.httpHeaderAuth.name = 'Renamed';

			const result = await service.preventTampering(
				{ nodes: [submitted] } as IWorkflowBase,
				'w1',
				user,
			);

			expect(result.nodes[0]).toEqual(submitted);
		});

		it('rejects a node that no version stored with that credential', async () => {
			workflowHistoryRepository.findNewestVersionNodes.mockResolvedValue([
				version('v3', [httpNode('own-cred')]),
			]);

			await expect(
				service.preventTampering(
					{ nodes: [httpNode('foreign-cred')] } as IWorkflowBase,
					'w1',
					user,
				),
			).rejects.toThrow(/credentials in the 'Call' node/);
		});

		it('reads only the newest versions, so an older match does not count', async () => {
			// The repository returns what it was asked for: the limit is the lookback.
			workflowHistoryRepository.findNewestVersionNodes.mockImplementation(
				async (_workflowId, limit) =>
					Array.from({ length: limit }, (_, i) => version(`v${limit - i}`, [httpNode('own-cred')])),
			);

			await expect(
				service.preventTampering(
					{ nodes: [httpNode('foreign-cred')] } as IWorkflowBase,
					'w1',
					user,
				),
			).rejects.toThrow(/credentials in the 'Call' node/);
			expect(workflowHistoryRepository.findNewestVersionNodes).toHaveBeenCalledTimes(1);
			expect(workflowHistoryRepository.findNewestVersionNodes).toHaveBeenCalledWith('w1', 20);
		});

		it('rejects a node whose other parameters changed since the version stored it', async () => {
			workflowHistoryRepository.findNewestVersionNodes.mockResolvedValue([
				version('v2', [httpNode('foreign-cred')]),
			]);

			await expect(
				service.preventTampering(
					{ nodes: [httpNode('foreign-cred', 'https://changed.test')] } as IWorkflowBase,
					'w1',
					user,
				),
			).rejects.toThrow(/credentials in the 'Call' node/);
		});

		it('reads no history when the user can use every credential in the save', async () => {
			const result = await service.preventTampering(
				{ nodes: [httpNode('own-cred', 'https://changed.test')] } as IWorkflowBase,
				'w1',
				user,
			);

			expect(result.nodes[0].parameters).toEqual({ url: 'https://changed.test' });
			expect(workflowHistoryRepository.findNewestVersionNodes).not.toHaveBeenCalled();
		});

		it('reads no history for a node without an id', async () => {
			const { id: _, ...withoutId } = httpNode('foreign-cred');

			await expect(
				service.preventTampering({ nodes: [withoutId] } as IWorkflowBase, 'w1', user),
			).rejects.toThrow(/credentials in the 'Call' node/);
			expect(workflowHistoryRepository.findNewestVersionNodes).not.toHaveBeenCalled();
		});

		it('reads no history for a node blocked only by a sub-workflow source it cannot inspect', async () => {
			const urlSourcedNode = {
				id: 'sub-1',
				name: 'Sub',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { source: 'url', workflowUrl: 'https://example.com/workflow.json' },
			} as unknown as INode;

			await expect(
				service.preventTampering({ nodes: [urlSourcedNode] } as IWorkflowBase, 'w1', user),
			).rejects.toThrow();
			expect(workflowHistoryRepository.findNewestVersionNodes).not.toHaveBeenCalled();
		});

		it('reads no history for a node that is read only already', async () => {
			workflowRepository.get.mockResolvedValue({
				nodes: [httpNode('foreign-cred')],
			} as unknown as WorkflowEntity);

			const result = await service.preventTampering(
				{ nodes: [httpNode('foreign-cred', 'https://changed.test')] } as IWorkflowBase,
				'w1',
				user,
			);

			expect(result.nodes[0]).toEqual(httpNode('foreign-cred'));
			expect(workflowHistoryRepository.findNewestVersionNodes).not.toHaveBeenCalled();
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
				error: { name: 'WorkflowActivationError', message: 'broken credential' },
			});
		});

		it('returns an unexpected failure instead of throwing it, and logs it', async () => {
			activeWorkflowManager.add.mockRejectedValue(new Error('active version missing'));

			const result = await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(result).toEqual({ error: { name: 'Error', message: 'active version missing' } });
			expect(workflowRepository.updateActiveState).toHaveBeenCalledWith('wf-1', false);
			expect(service['logger'].error).toHaveBeenCalled();
		});

		it('should still deactivate the workflow when the trigger teardown fails', async () => {
			activeWorkflowManager.add.mockRejectedValue(new WorkflowActivationError('broken credential'));
			activeWorkflowManager.remove.mockRejectedValue(new Error('teardown failed'));

			await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(workflowRepository.updateActiveState).toHaveBeenCalledWith('wf-1', false);
		});

		it('returns the failure even when marking the workflow unpublished fails', async () => {
			activeWorkflowManager.add.mockRejectedValue(new WorkflowActivationError('broken credential'));
			workflowRepository.updateActiveState.mockRejectedValueOnce(new Error('database unavailable'));

			const result = await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(result).toEqual({
				error: { name: 'WorkflowActivationError', message: 'broken credential' },
			});
			expect(service['logger'].error).toHaveBeenCalled();
		});

		it('should not touch triggers or the active flag when reactivation succeeds', async () => {
			activeWorkflowManager.add.mockResolvedValue({ webhooks: true, triggersAndPollers: true });

			const result = await service['attemptWorkflowReactivation']('wf-1', 'version-1', 'user-1');

			expect(result).toBeUndefined();
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(workflowRepository.updateActiveState).not.toHaveBeenCalled();
		});
	});

	const violation = {
		kind: 'node-type-unavailable',
		checkId: 'node-type-policy',
		message: 'Slack is not available in this project',
	};

	describe('transferFolder()', () => {
		const user = mock<User>({ id: 'user-1' });
		const sourceProject = mock<Project>({ id: 'proj-source' });
		const destinationProject = mock<Project>({ id: 'proj-dest' });

		const makeWorkflow = (id: string) =>
			mock<WorkflowEntity>({
				id,
				name: `Workflow ${id}`,
				nodes: [],
				activeVersionId: 'version-1',
				shared: [mock<SharedWorkflow>({ role: 'workflow:owner', project: sourceProject })],
			});
		const workflows = [makeWorkflow('wf-1'), makeWorkflow('wf-2')];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let transferOwnershipSpy: ReturnType<typeof vi.spyOn<any, any>>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let moveFoldersSpy: ReturnType<typeof vi.spyOn<any, any>>;

		beforeEach(() => {
			folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue([]);
			workflowRepository.findInFoldersForTransfer.mockResolvedValue(workflows);
			projectService.getProjectWithScope.mockResolvedValue(destinationProject);
			activeWorkflowManager.remove.mockResolvedValue(undefined);
			activeWorkflowManager.add.mockResolvedValue({ webhooks: true, triggersAndPollers: true });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			transferOwnershipSpy = vi
				.spyOn(service as any, 'transferWorkflowOwnership')
				.mockResolvedValue(undefined);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.spyOn(service as any, 'shareCredentialsWithProject').mockResolvedValue(undefined);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			moveFoldersSpy = vi
				.spyOn(service as any, 'moveFoldersToDestination')
				.mockResolvedValue(undefined);
		});

		it('moves the folder without asking the transfer policy', async () => {
			await service.transferFolder(user, 'proj-source', 'folder-1', 'proj-dest', '0');

			expect(workflowRepository.findInFoldersForTransfer).toHaveBeenCalledWith(['folder-1'], {
				withNodes: false,
			});
			expect(policyEnforcementService.enforceWorkflowTransfer).not.toHaveBeenCalled();
			expect(transferOwnershipSpy).toHaveBeenCalledTimes(1);
			expect(moveFoldersSpy).toHaveBeenCalledTimes(1);
		});

		it('reports the workflows whose republish the destination policy refuses', async () => {
			activeWorkflowManager.add.mockRejectedValueOnce(new PolicyViolationError([violation]));

			const result = await service.transferFolder(
				user,
				'proj-source',
				'folder-1',
				'proj-dest',
				'0',
			);

			expect(result).toEqual({
				unpublishedWorkflows: [
					{ id: 'wf-1', name: 'Workflow wf-1', unpublishReasons: [violation] },
				],
			});
			expect(workflowRepository.updateActiveState).toHaveBeenCalledExactlyOnceWith('wf-1', false);
			// One refusal must not leave the rest of the folder unpublished.
			expect(activeWorkflowManager.add).toHaveBeenCalledTimes(2);
		});

		it('republishes the rest of the folder after an unexpected failure, and reports it', async () => {
			activeWorkflowManager.add.mockRejectedValueOnce(new Error('active version missing'));

			const result = await service.transferFolder(
				user,
				'proj-source',
				'folder-1',
				'proj-dest',
				'0',
			);

			expect(result).toEqual({
				unpublishedWorkflows: [
					{
						id: 'wf-1',
						name: 'Workflow wf-1',
						error: { name: 'Error', message: 'active version missing' },
					},
				],
			});
			expect(activeWorkflowManager.add).toHaveBeenCalledTimes(2);
		});

		it('reports nothing when every workflow republishes', async () => {
			const result = await service.transferFolder(
				user,
				'proj-source',
				'folder-1',
				'proj-dest',
				'0',
			);

			expect(result).toEqual({ unpublishedWorkflows: [] });
		});
	});

	describe('previewFolderTransfer()', () => {
		const user = mock<User>({ id: 'user-1' });
		const sourceProject = mock<Project>({ id: 'proj-source' });
		const destinationProject = mock<Project>({ id: 'proj-dest' });

		const makeWorkflow = (id: string, owner = sourceProject) =>
			mock<WorkflowEntity>({
				id,
				name: `Workflow ${id}`,
				nodes: [],
				activeVersion: null,
				shared: [mock<SharedWorkflow>({ role: 'workflow:owner', project: owner })],
			});

		const preview = async () =>
			await service.previewFolderTransfer(user, 'proj-source', 'folder-1', 'proj-dest');

		beforeEach(() => {
			folderRepository.findOneOrFailFolderInProject.mockResolvedValue(mock());
			folderRepository.getAllFolderIdsInHierarchy.mockResolvedValue([]);
			projectService.getProjectWithScope.mockResolvedValue(destinationProject);
			policyEnforcementService.hasChecksFor.mockReturnValue(true);
			policyEnforcementService.evaluateWorkflowTransfer.mockResolvedValue({ violations: [] });
		});

		describe('when no check is registered', () => {
			beforeEach(() => {
				policyEnforcementService.hasChecksFor.mockReturnValue(false);
			});

			it('returns an empty preview without the nodes and without evaluating', async () => {
				workflowRepository.findInFoldersForTransfer.mockResolvedValue([makeWorkflow('wf-1')]);

				await expect(preview()).resolves.toEqual({
					restricted: [],
					workflowsToUnpublish: [],
					checkFailed: false,
				});
				expect(workflowRepository.findInFoldersForTransfer).toHaveBeenCalledWith(['folder-1'], {
					withNodes: false,
				});
				expect(policyEnforcementService.evaluateWorkflowTransfer).not.toHaveBeenCalled();
			});

			it('still refuses a folder whose workflows the destination already owns', async () => {
				workflowRepository.findInFoldersForTransfer.mockResolvedValue([
					makeWorkflow('wf-1', destinationProject),
				]);

				await expect(preview()).rejects.toThrow(TransferWorkflowError);
			});
		});

		it('evaluates at most five workflows at once', async () => {
			workflowRepository.findInFoldersForTransfer.mockResolvedValue(
				Array.from({ length: 12 }, (_, index) => makeWorkflow(`wf-${index}`)),
			);
			let inFlight = 0;
			let maxInFlight = 0;
			policyEnforcementService.evaluateWorkflowTransfer.mockImplementation(async () => {
				maxInFlight = Math.max(maxInFlight, ++inFlight);
				await new Promise((resolve) => setImmediate(resolve));
				inFlight--;
				return { violations: [] };
			});

			await preview();

			expect(policyEnforcementService.evaluateWorkflowTransfer).toHaveBeenCalledTimes(12);
			expect(maxInFlight).toBe(5);
		});

		it('refuses a folder whose workflows the destination already owns, as the move does', async () => {
			workflowRepository.findInFoldersForTransfer.mockResolvedValue([
				makeWorkflow('wf-1', destinationProject),
			]);

			await expect(preview()).rejects.toThrow(TransferWorkflowError);
			expect(policyEnforcementService.evaluateWorkflowTransfer).not.toHaveBeenCalled();
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
			// Ownership transfer and credential sharing are exercised by their own
			// describe blocks below.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			transferOwnershipSpy = vi
				.spyOn(service as any, 'transferWorkflowOwnership')
				.mockResolvedValue(undefined);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			shareCredentialsSpy = vi
				.spyOn(service as any, 'shareCredentialsWithProject')
				.mockResolvedValue(undefined);
		});

		it('moves the workflow without asking the transfer policy', async () => {
			const result = await service.transferWorkflow(user, 'wf-1', 'proj-dest');

			expect(result).toBeUndefined();
			expect(policyEnforcementService.enforceWorkflowTransfer).not.toHaveBeenCalled();
			expect(transferOwnershipSpy).toHaveBeenCalledTimes(1);
			expect(shareCredentialsSpy).toHaveBeenCalledTimes(1);
			expect(workflowRepository.update).toHaveBeenCalledWith(
				{ id: 'wf-1' },
				{ parentFolder: null },
			);
		});

		it('unpublishes a published workflow when the destination policy refuses the republish', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				makeWorkflow({ activeVersionId: 'version-1' }),
			);
			activeWorkflowManager.add.mockRejectedValueOnce(new PolicyViolationError([violation]));

			const result = await service.transferWorkflow(user, 'wf-1', 'proj-dest');

			expect(result).toEqual({ unpublishReasons: [violation] });
			expect(transferOwnershipSpy).toHaveBeenCalledTimes(1);
			expect(workflowRepository.updateActiveState).toHaveBeenCalledExactlyOnceWith('wf-1', false);
			expect(workflowPublishHistoryRepository.addRecord).toHaveBeenCalledWith(
				expect.objectContaining({ workflowId: 'wf-1', event: 'deactivated' }),
			);
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
