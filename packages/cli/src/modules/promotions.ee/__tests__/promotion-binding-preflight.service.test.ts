import { promotionBindingPreflightResultSchema } from '@n8n/api-types';
import type { CredentialsRepository, ProjectRepository, VariablesRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import type {
	InventoryCredential,
	InventoryVariable,
	InventoryWorkflow,
	PackageDirectoryInventory,
	PackageDirectoryInventoryReader,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import type { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';

import { PromotionBindingPreflightService } from '../promotion-binding-preflight.service';

const inventoryReader = mock<PackageDirectoryInventoryReader>();
const credentialTypes = mock<CredentialTypes>();
const credentialsRepository = mock<CredentialsRepository>();
const variablesRepository = mock<VariablesRepository>();
const projectRepository = mock<ProjectRepository>();

const service = new PromotionBindingPreflightService(
	mock<PackageImportConfig>(),
	inventoryReader,
	new VariableRequirementsExtractor(),
	credentialTypes,
	credentialsRepository,
	variablesRepository,
	projectRepository,
);

const PROJECT_A = { id: 'proj-a', name: 'Alpha' };
const PROJECT_B = { id: 'proj-b', name: 'Beta' };
const PROJECT_C = { id: 'proj-c', name: 'Gamma' };

function credentialNode(
	name: string,
	type: string,
	id: string | null,
	credentialName = `${type} credential`,
): INode {
	return {
		id: `node-${name}`,
		name,
		type: 'n8n-nodes-base.github',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { [type]: { id, name: credentialName } },
	};
}

function variableNode(name: string, expression: string): INode {
	return {
		id: `node-${name}`,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: { value: expression },
	};
}

function inventoryWorkflow(
	id: string,
	projectId: string,
	nodes: INode[],
	overrides: Partial<InventoryWorkflow['content']> = {},
): InventoryWorkflow {
	return {
		path: `projects/${projectId}/workflows/${id}/workflow.json`,
		projectId,
		id,
		name: `Workflow ${id}`,
		content: {
			name: `Workflow ${id}`,
			nodes,
			connections: {},
			nodeGroups: [],
			isArchived: false,
			...overrides,
		},
	};
}

function inventoryCredential(
	id: string,
	projectId: string | null,
	type = 'githubApi',
	data?: InventoryCredential['credential']['data'],
): InventoryCredential {
	return {
		path: `${projectId ? `projects/${projectId}/` : ''}credentials/${id}/credential.json`,
		projectId,
		credential: { id, name: `Credential ${id}`, type, ...(data ? { data } : {}) },
	};
}

function inventoryVariable(name: string, projectId: string | null): InventoryVariable {
	return {
		path: `${projectId ? `projects/${projectId}/` : ''}variables/${name}/variable.json`,
		projectId,
		variable: { name, type: 'string' },
	};
}

function useInventory(inventory: Partial<PackageDirectoryInventory>) {
	inventoryReader.read.mockResolvedValue({
		projects: [
			{ path: 'projects/proj-a', ...PROJECT_A },
			{ path: 'projects/proj-b', ...PROJECT_B },
			{ path: 'projects/proj-c', ...PROJECT_C },
		],
		workflows: [],
		credentials: [],
		variables: [],
		...inventory,
	});
}

const workflowRef = (id: string) => ({ id, name: `Workflow ${id}` });

const emptyResult = {
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
};
const check = async () => {
	const result = await service.checkDirectory({ sourceDir: '/checkout' });
	expect(promotionBindingPreflightResultSchema.parse(result)).toStrictEqual(result);
	return result;
};
const consumer = (project: typeof PROJECT_A, ...ids: string[]) => ({
	project,
	workflows: ids.map(workflowRef),
});
const targetCredential = (
	id: string,
	projectIds: string[] = [],
	overrides: Partial<
		Awaited<ReturnType<CredentialsRepository['findPromotionBindingAccess']>>[number]
	> = {},
) => ({
	id,
	type: 'githubApi',
	usageScope: 'project' as const,
	isGlobal: false,
	projectIds,
	...overrides,
});

describe('PromotionBindingPreflightService', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialsRepository.findPromotionBindingAccess.mockResolvedValue([]);
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([]);
		projectRepository.findTypesByIds.mockResolvedValue(
			[PROJECT_A, PROJECT_B, PROJECT_C].map(({ id }) => ({ id, type: 'team' })),
		);
	});

	it('returns all missing projects in ID order with their package fields', async () => {
		const metadata = {
			icon: { type: 'icon' as const, value: '' },
			description: 'a'.repeat(513),
			customTelemetryTags: [
				{ key: ' team ', value: '' },
				{ key: 'team', value: 'Sales' },
			],
		};
		useInventory({
			projects: [
				{ path: 'projects/c', ...PROJECT_C },
				{ path: 'projects/b', ...PROJECT_B },
				{ path: 'projects/a', ...PROJECT_A, ...metadata },
			],
		});
		projectRepository.findTypesByIds.mockResolvedValue([{ id: PROJECT_B.id, type: 'team' }]);

		expect(await check()).toEqual({
			...emptyResult,
			missingProjects: [{ ...PROJECT_A, ...metadata }, PROJECT_C],
		});
	});

	it('returns a missing credential and variable with owner context, consumers and expression data', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('GitHub 1', 'githubApi', 'cred-1'),
					credentialNode('GitHub 2', 'githubApi', 'cred-1'),
					variableNode('Set', '={{ $vars.REGION }} {{ $vars["REGION"] }}'),
				]),
				inventoryWorkflow('wf-2', PROJECT_A.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
			],
			credentials: [
				inventoryCredential('cred-1', PROJECT_A.id, 'githubApi', { token: '={{ $secrets.gh }}' }),
				inventoryCredential('cred-unused', PROJECT_A.id),
			],
			variables: [
				inventoryVariable('REGION', PROJECT_A.id),
				inventoryVariable('UNUSED', PROJECT_A.id),
			],
		});
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				{
					kind: 'credential',
					sourceId: 'cred-1',
					name: 'Credential cred-1',
					credentialType: 'githubApi',
					expressionData: { token: '={{ $secrets.gh }}' },
					ownerProject: PROJECT_A,
					consumers: [consumer(PROJECT_A, 'wf-1', 'wf-2')],
				},
				{
					kind: 'variable',
					name: 'REGION',
					variableType: 'string',
					scope: { kind: 'project', project: PROJECT_A },
					consumers: [consumer(PROJECT_A, 'wf-1')],
				},
			],
		});
		expect(credentialsRepository.findPromotionBindingAccess).toHaveBeenCalledExactlyOnceWith(
			['cred-1'],
			[PROJECT_A.id],
		);
		expect(variablesRepository.findKeysInProjectsOrGlobal).toHaveBeenCalledExactlyOnceWith(
			['REGION'],
			[PROJECT_A.id],
		);
	});

	it('returns nothing when every credential is usable and every variable exists in its source project', async () => {
		useInventory({
			projects: [{ path: 'projects/proj-a', ...PROJECT_A }],
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('GitHub', 'githubApi', 'cred-1'),
					variableNode('Set', '={{ $vars.REGION }}'),
				]),
			],
			variables: [inventoryVariable('REGION', PROJECT_A.id)],
		});
		credentialsRepository.findPromotionBindingAccess.mockResolvedValue([
			targetCredential('cred-1', [PROJECT_A.id]),
		]);
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: PROJECT_A.id },
		]);
		projectRepository.findTypesByIds.mockResolvedValue([{ id: PROJECT_A.id, type: 'team' }]);
		expect(await check()).toEqual(emptyResult);
		expect(projectRepository.findTypesByIds).toHaveBeenCalledExactlyOnceWith([PROJECT_A.id]);
	});

	it('separates type conflicts from access setup and preserves each project grant', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('GitHub', 'githubApi', 'cred-wrong-type'),
					credentialNode('Slack', 'slackApi', 'cred-private'),
				]),
				inventoryWorkflow('wf-2', PROJECT_B.id, [
					credentialNode('Slack', 'slackApi', 'cred-private'),
				]),
			],
		});
		credentialsRepository.findPromotionBindingAccess.mockResolvedValue([
			targetCredential('cred-wrong-type', [], { type: 'gitlabApi' }),
			targetCredential('cred-private', [PROJECT_A.id], { type: 'slackApi' }),
		]);
		projectRepository.findTypesByIds.mockResolvedValue([
			{ id: PROJECT_A.id, type: 'team' },
			{ id: PROJECT_B.id, type: 'team' },
			{ id: PROJECT_C.id, type: 'team' },
		]);
		expect(await check()).toEqual({
			...emptyResult,
			accessRequirements: [
				{
					kind: 'credential',
					code: 'access-required',
					sourceId: 'cred-private',
					name: 'slackApi credential',
					credentialType: 'slackApi',
					consumers: [consumer(PROJECT_B, 'wf-2')],
				},
			],
			conflicts: [
				expect.objectContaining({
					code: 'type-mismatch',
					sourceId: 'cred-wrong-type',
					targetType: 'gitlabApi',
					consumers: [consumer(PROJECT_A, 'wf-1')],
				}),
			],
		});
	});

	it('reports an unknown credential type', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [credentialNode('Odd', 'unknownApi', 'cred-1')]),
			],
		});
		credentialTypes.recognizes.mockReturnValue(false);
		credentialsRepository.findPromotionBindingAccess.mockResolvedValue([
			targetCredential('cred-1', [], { type: 'unknownApi' }),
		]);
		expect(await check()).toEqual({
			...emptyResult,
			conflicts: [
				expect.objectContaining({
					code: 'unknown-type',
					sourceId: 'cred-1',
					expectedTypes: ['unknownApi'],
					consumers: [consumer(PROJECT_A, 'wf-1')],
				}),
			],
		});
	});

	it.each([
		{ id: null, managed: true, conflictCode: undefined },
		{ id: '', managed: true, conflictCode: undefined },
		{ id: null, managed: false, conflictCode: 'missing-id' },
		{ id: 'cred-1', managed: true, conflictCode: 'unknown-owner' },
	])(
		'checks Gateway credits references with id=$id and managed=$managed',
		async ({ id, managed, conflictCode }) => {
			const node = credentialNode('Model', 'googlePalmApi', id);
			node.credentials = { googlePalmApi: { id, name: '', __aiGatewayManaged: managed } };
			useInventory({ workflows: [inventoryWorkflow('wf-1', PROJECT_A.id, [node])] });

			expect(await check()).toEqual({
				...emptyResult,
				conflicts: conflictCode
					? [expect.objectContaining({ code: conflictCode, sourceId: id })]
					: [],
			});
			expect(credentialsRepository.findPromotionBindingAccess).toHaveBeenCalledExactlyOnceWith(
				id ? [id] : [],
				id || !managed ? [PROJECT_A.id] : [],
			);
		},
	);

	it('groups ID-less references by type and name, and references with IDs by ID', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('Test', 'githubApi', null, 'Test GitHub'),
					credentialNode('As GitHub', 'githubApi', 'cred-1'),
				]),
				inventoryWorkflow('wf-2', PROJECT_A.id, [
					credentialNode('Production', 'githubApi', null, 'Production GitHub'),
					credentialNode('As GitLab', 'gitlabApi', 'cred-1'),
				]),
				inventoryWorkflow('wf-3', PROJECT_A.id, [
					credentialNode('Production', 'githubApi', null, 'Production GitHub'),
				]),
			],
		});
		expect(await check()).toEqual({
			...emptyResult,
			conflicts: [
				expect.objectContaining({
					code: 'missing-id',
					sourceId: null,
					name: 'Production GitHub',
					expectedTypes: ['githubApi'],
					consumers: [consumer(PROJECT_A, 'wf-2', 'wf-3')],
					referenceFiles: [
						'projects/proj-a/workflows/wf-2/workflow.json',
						'projects/proj-a/workflows/wf-3/workflow.json',
					],
				}),
				expect.objectContaining({
					code: 'missing-id',
					sourceId: null,
					name: 'Test GitHub',
					expectedTypes: ['githubApi'],
					consumers: [consumer(PROJECT_A, 'wf-1')],
					referenceFiles: ['projects/proj-a/workflows/wf-1/workflow.json'],
				}),
				expect.objectContaining({
					code: 'conflicting-types',
					sourceId: 'cred-1',
					expectedTypes: ['githubApi', 'gitlabApi'],
					consumers: [consumer(PROJECT_A, 'wf-1', 'wf-2')],
				}),
			],
		});
	});

	it('reports a bundled type conflict and retains other binding results', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('GitHub', 'githubApi', 'cred-1'),
					variableNode('Set', '={{ $vars.REGION }}'),
				]),
			],
			credentials: [inventoryCredential('cred-1', PROJECT_A.id, 'gitlabApi')],
			variables: [inventoryVariable('REGION', PROJECT_A.id)],
		});
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				expect.objectContaining({
					kind: 'variable',
					name: 'REGION',
					scope: { kind: 'project', project: PROJECT_A },
				}),
			],
			conflicts: [
				{
					kind: 'credential',
					code: 'conflicting-types',
					sourceId: 'cred-1',
					name: 'Credential cred-1',
					expectedTypes: ['githubApi', 'gitlabApi'],
					filePath: 'projects/proj-a/credentials/cred-1/credential.json',
					referenceFiles: ['projects/proj-a/workflows/wf-1/workflow.json'],
					consumers: [consumer(PROJECT_A, 'wf-1')],
				},
			],
		});
	});

	it('marks the owner unknown for a missing credential without a file or with a file outside every project', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('No file', 'githubApi', 'cred-no-file'),
					credentialNode('Top level', 'githubApi', 'cred-top'),
				]),
			],
			credentials: [inventoryCredential('cred-top', null)],
		});
		expect(await check()).toEqual({
			...emptyResult,
			conflicts: [
				{
					kind: 'credential',
					code: 'unknown-owner',
					sourceId: 'cred-no-file',
					name: 'githubApi credential',
					expectedTypes: ['githubApi'],
					referenceFiles: ['projects/proj-a/workflows/wf-1/workflow.json'],
					consumers: [consumer(PROJECT_A, 'wf-1')],
				},
				{
					kind: 'credential',
					code: 'unknown-owner',
					sourceId: 'cred-top',
					name: 'Credential cred-top',
					expectedTypes: ['githubApi'],
					filePath: 'credentials/cred-top/credential.json',
					referenceFiles: ['projects/proj-a/workflows/wf-1/workflow.json'],
					consumers: [consumer(PROJECT_A, 'wf-1')],
				},
			],
		});
	});

	it('keeps one missing credential with its source owner and all consuming projects', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-b', PROJECT_B.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
				inventoryWorkflow('wf-a', PROJECT_A.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
			],
			credentials: [inventoryCredential('cred-1', PROJECT_C.id)],
		});
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				expect.objectContaining({
					sourceId: 'cred-1',
					ownerProject: PROJECT_C,
					consumers: [consumer(PROJECT_A, 'wf-a'), consumer(PROJECT_B, 'wf-b')],
				}),
			],
		});
	});

	it('reports personal project collisions and treats missing projects as normal setup', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
				inventoryWorkflow('wf-b', PROJECT_B.id, [
					credentialNode('GitHub', 'githubApi', 'cred-new'),
				]),
				inventoryWorkflow('wf-c', PROJECT_C.id, [
					credentialNode('GitHub', 'githubApi', 'cred-existing'),
				]),
			],
			credentials: [inventoryCredential('cred-new', PROJECT_B.id)],
			variables: [inventoryVariable('REGION', PROJECT_A.id)],
		});
		projectRepository.findTypesByIds.mockResolvedValue([{ id: PROJECT_B.id, type: 'personal' }]);
		credentialsRepository.findPromotionBindingAccess.mockResolvedValue([
			targetCredential('cred-existing'),
		]);
		expect(await check()).toEqual({
			missingProjects: [PROJECT_A, PROJECT_C],
			missingBindings: [
				expect.objectContaining({
					kind: 'variable',
					name: 'REGION',
					scope: { kind: 'project', project: PROJECT_A },
				}),
			],
			accessRequirements: [
				expect.objectContaining({
					code: 'access-required',
					sourceId: 'cred-existing',
					consumers: [consumer(PROJECT_C, 'wf-c')],
				}),
			],
			conflicts: [
				{
					kind: 'project',
					code: 'project-not-team',
					project: PROJECT_B,
					filePath: 'projects/proj-b/project.json',
					workflows: [workflowRef('wf-b')],
				},
			],
			warnings: [],
		});
	});

	it('resolves a variable only from its source project or source global definition', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [
					variableNode('Set', '={{ $vars.REGION }} {{ $vars.GLOBAL_ONLY }}'),
				]),
				inventoryWorkflow('wf-b', PROJECT_B.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
			variables: [
				inventoryVariable('GLOBAL_ONLY', null),
				inventoryVariable('REGION', PROJECT_B.id),
			],
		});
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: PROJECT_A.id },
		]);
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				expect.objectContaining({
					name: 'GLOBAL_ONLY',
					scope: { kind: 'global' },
					consumers: [consumer(PROJECT_A, 'wf-a')],
				}),
				expect.objectContaining({
					name: 'REGION',
					scope: { kind: 'project', project: PROJECT_B },
					consumers: [consumer(PROJECT_B, 'wf-b')],
				}),
			],
			conflicts: [
				{
					kind: 'variable',
					code: 'missing-definition',
					name: 'REGION',
					consumers: [consumer(PROJECT_A, 'wf-a')],
					referenceFiles: ['projects/proj-a/workflows/wf-a/workflow.json'],
				},
			],
		});
	});

	it('returns a missing project variable even when the target has a global fallback', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
			variables: [inventoryVariable('REGION', PROJECT_A.id)],
		});
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: null },
		]);
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				expect.objectContaining({
					kind: 'variable',
					name: 'REGION',
					scope: { kind: 'project', project: PROJECT_A },
				}),
			],
		});
	});

	it('finds credentials inside an inline sub-workflow and variables in workflow settings', async () => {
		const inline = JSON.stringify({ nodes: [credentialNode('Inner', 'githubApi', 'cred-inner')] });
		useInventory({
			workflows: [
				inventoryWorkflow(
					'wf-1',
					PROJECT_A.id,
					[
						{
							id: 'exec',
							name: 'Execute',
							type: 'n8n-nodes-base.executeWorkflow',
							typeVersion: 1,
							position: [0, 0],
							parameters: { workflowJson: inline },
						},
					],
					{ settings: { errorWorkflow: '={{ $vars.ERROR_WF }}' } },
				),
			],
			credentials: [inventoryCredential('cred-inner', PROJECT_A.id)],
			variables: [inventoryVariable('ERROR_WF', null)],
		});
		expect(await check()).toEqual({
			...emptyResult,
			missingBindings: [
				expect.objectContaining({ kind: 'credential', sourceId: 'cred-inner' }),
				expect.objectContaining({ kind: 'variable', name: 'ERROR_WF' }),
			],
		});
	});

	it.each([
		{
			isGlobal: false,
			usageScope: 'project' as const,
			type: 'githubApi',
			access: true,
			code: undefined,
		},
		{
			isGlobal: true,
			usageScope: 'project' as const,
			type: 'githubApi',
			access: false,
			code: undefined,
		},
		{
			isGlobal: true,
			usageScope: 'instance' as const,
			type: 'githubApi',
			access: false,
			code: 'incompatible-usage-scope',
		},
		{
			isGlobal: false,
			usageScope: 'instance' as const,
			type: 'githubApi',
			access: false,
			code: 'incompatible-usage-scope',
		},
		{
			isGlobal: true,
			usageScope: 'project' as const,
			type: 'slackApi',
			access: false,
			code: 'type-mismatch',
		},
	])(
		'checks existing credentials for new projects: $isGlobal / $usageScope / $type',
		async ({ isGlobal, usageScope, type, access, code }) => {
			useInventory({
				workflows: [
					inventoryWorkflow('wf-a', PROJECT_A.id, [
						credentialNode('GitHub', 'githubApi', 'cred-1'),
					]),
					inventoryWorkflow('wf-b', PROJECT_B.id, [
						credentialNode('GitHub', 'githubApi', 'cred-1'),
					]),
				],
			});
			credentialsRepository.findPromotionBindingAccess.mockResolvedValue([
				targetCredential('cred-1', [], { isGlobal, usageScope, type }),
			]);
			expect(await check()).toEqual({
				...emptyResult,
				accessRequirements: access
					? [
							{
								kind: 'credential',
								code: 'access-required',
								sourceId: 'cred-1',
								name: 'githubApi credential',
								credentialType: 'githubApi',
								consumers: [consumer(PROJECT_A, 'wf-a'), consumer(PROJECT_B, 'wf-b')],
							},
						]
					: [],
				conflicts: code
					? [
							expect.objectContaining({
								code,
								sourceId: 'cred-1',
								consumers: [consumer(PROJECT_A, 'wf-a'), consumer(PROJECT_B, 'wf-b')],
							}),
						]
					: [],
			});
		},
	);

	it.each([true, false])(
		'reports global shadowing separately when the target global exists: %s',
		async (globalExists) => {
			useInventory({
				workflows: [
					inventoryWorkflow('wf-b', PROJECT_B.id, [variableNode('Set', '={{ $vars.REGION }}')]),
					inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
				],
				variables: [inventoryVariable('REGION', null)],
			});
			variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
				{ key: 'REGION', projectId: PROJECT_A.id },
				...(globalExists ? [{ key: 'REGION', projectId: null }] : []),
			]);
			expect(await check()).toEqual({
				...emptyResult,
				missingBindings: globalExists
					? []
					: [
							{
								kind: 'variable',
								name: 'REGION',
								variableType: 'string',
								scope: { kind: 'global' },
								consumers: [consumer(PROJECT_A, 'wf-a'), consumer(PROJECT_B, 'wf-b')],
							},
						],
				warnings: [
					{
						kind: 'variable',
						code: 'variable-shadowed',
						name: 'REGION',
						scope: { kind: 'global' },
						consumers: [consumer(PROJECT_A, 'wf-a')],
					},
				],
			});
		},
	);

	it.each([undefined, '', 'eu-west-1'])(
		'preserves the bundled value and exact scopes: %s',
		async (value) => {
			const a = inventoryVariable('REGION', PROJECT_A.id);
			if (value !== undefined) a.variable.value = value;
			useInventory({
				workflows: [
					inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
					inventoryWorkflow('wf-b', PROJECT_B.id, [variableNode('Set', '={{ $vars.REGION }}')]),
				],
				variables: [
					a,
					inventoryVariable('REGION', PROJECT_B.id),
					inventoryVariable('REGION', null),
				],
			});
			expect(await check()).toStrictEqual({
				...emptyResult,
				missingBindings: [
					{
						kind: 'variable',
						name: 'REGION',
						variableType: 'string',
						scope: { kind: 'project', project: PROJECT_A },
						consumers: [consumer(PROJECT_A, 'wf-a')],
						...(value !== undefined ? { sourceValue: value } : {}),
					},
					{
						kind: 'variable',
						name: 'REGION',
						variableType: 'string',
						scope: { kind: 'project', project: PROJECT_B },
						consumers: [consumer(PROJECT_B, 'wf-b')],
					},
				],
			});
		},
	);

	it('keeps a project named missing separate from an absent variable definition', async () => {
		const project = { id: 'missing', name: 'Missing' };
		useInventory({
			projects: [
				{ path: 'projects/missing', ...project },
				{ path: 'projects/proj-a', ...PROJECT_A },
			],
			workflows: [
				inventoryWorkflow('wf-1', project.id, [variableNode('Set', '={{ $vars.REGION }}')]),
				inventoryWorkflow('wf-2', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
			variables: [inventoryVariable('REGION', project.id)],
		});
		expect(await check()).toEqual({
			...emptyResult,
			missingProjects: [project],
			missingBindings: [
				expect.objectContaining({
					name: 'REGION',
					scope: { kind: 'project', project },
					consumers: [consumer(project, 'wf-1')],
				}),
			],
			conflicts: [
				expect.objectContaining({
					code: 'missing-definition',
					name: 'REGION',
					consumers: [consumer(PROJECT_A, 'wf-2')],
				}),
			],
		});
	});

	it('reports an absent variable definition without guessing its scope', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
		});
		expect(await check()).toEqual({
			...emptyResult,
			conflicts: [
				{
					kind: 'variable',
					code: 'missing-definition',
					name: 'REGION',
					consumers: [consumer(PROJECT_A, 'wf-a')],
					referenceFiles: ['projects/proj-a/workflows/wf-a/workflow.json'],
				},
			],
		});
	});
});
