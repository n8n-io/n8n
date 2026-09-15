import type { CredentialsRepository, ProjectRepository, User, VariablesRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { IdBasedCredentialMatcher } from '@/modules/n8n-packages/entities/credential/id-based-credential-matcher';
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

const user = mock<User>({ id: 'user-1' });

const inventoryReader = mock<PackageDirectoryInventoryReader>();
const credentialTypes = mock<CredentialTypes>();
const credentialMatcher = mock<IdBasedCredentialMatcher>();
const credentialsRepository = mock<CredentialsRepository>();
const variablesRepository = mock<VariablesRepository>();
const projectRepository = mock<ProjectRepository>();

const service = new PromotionBindingPreflightService(
	mock<PackageImportConfig>(),
	inventoryReader,
	new VariableRequirementsExtractor(),
	credentialTypes,
	credentialMatcher,
	credentialsRepository,
	variablesRepository,
	projectRepository,
);

const PROJECT_A = { id: 'proj-a', name: 'Alpha' };
const PROJECT_B = { id: 'proj-b', name: 'Beta' };
const PROJECT_C = { id: 'proj-c', name: 'Gamma' };

function credentialNode(name: string, type: string, id: string | null): INode {
	return {
		id: `node-${name}`,
		name,
		type: 'n8n-nodes-base.github',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { [type]: { id, name: `${type} credential` } },
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

const check = async () =>
	(await service.checkDirectory({ sourceDir: '/checkout', user })).bindingsNeedingReview;

describe('PromotionBindingPreflightService', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialMatcher.match.mockResolvedValue({ successes: new Map(), failures: [] });
		credentialsRepository.findTypesByIds.mockResolvedValue([]);
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([]);
		projectRepository.findTypesByIds.mockImplementation(async (ids) =>
			ids.map((id) => ({ id, type: 'team' as const })),
		);
	});

	it('returns a missing credential and variable with owner evidence, consumers and expression data', async () => {
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

		expect(await check()).toEqual([
			{
				kind: 'credential',
				sourceId: 'cred-1',
				name: 'Credential cred-1',
				expectedTypes: ['githubApi'],
				expressionData: { token: '={{ $secrets.gh }}' },
				sourceFile: {
					location: 'project',
					project: PROJECT_A,
					targetProjectStatus: 'team',
					filePath: 'projects/proj-a/credentials/cred-1/credential.json',
				},
				targetMatch: 'missing',
				consumers: [
					{
						project: PROJECT_A,
						targetProjectStatus: 'team',
						workflows: [workflowRef('wf-1'), workflowRef('wf-2')],
						accessStatus: 'unchecked',
					},
				],
				issues: ['missing-credential'],
			},
			{
				kind: 'variable',
				name: 'REGION',
				sourceFile: {
					location: 'project',
					project: PROJECT_A,
					targetProjectStatus: 'team',
					filePath: 'projects/proj-a/variables/REGION/variable.json',
				},
				consumer: {
					project: PROJECT_A,
					targetProjectStatus: 'team',
					workflows: [workflowRef('wf-1')],
				},
				targetMatch: 'missing',
				issues: ['missing-variable'],
			},
		]);
		expect(credentialsRepository.findTypesByIds).toHaveBeenCalledWith(['cred-1']);
		expect(variablesRepository.findKeysInProjectsOrGlobal).toHaveBeenCalledWith(
			['REGION'],
			[PROJECT_A.id],
		);
		expect(credentialMatcher.match).not.toHaveBeenCalled();
	});

	it('returns nothing when every credential is usable and every variable exists in its project', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('GitHub', 'githubApi', 'cred-1'),
					variableNode('Set', '={{ $vars.REGION }}'),
				]),
			],
		});
		credentialsRepository.findTypesByIds.mockResolvedValue([{ id: 'cred-1', type: 'githubApi' }]);
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: PROJECT_A.id },
		]);

		expect(await check()).toEqual([]);
		expect(credentialMatcher.match).toHaveBeenCalledWith(
			[
				{
					id: 'cred-1',
					name: 'githubApi credential',
					type: 'githubApi',
					usedByWorkflows: ['wf-1'],
				},
			],
			{ projectId: PROJECT_A.id, user },
		);
	});

	it('keeps an existing credential unresolved when its type differs or a project cannot use it', async () => {
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
		credentialsRepository.findTypesByIds.mockResolvedValue([
			{ id: 'cred-wrong-type', type: 'gitlabApi' },
			{ id: 'cred-private', type: 'slackApi' },
		]);
		credentialMatcher.match.mockImplementation(async (_, { projectId }) => ({
			successes: new Map(),
			failures:
				projectId === PROJECT_B.id
					? [{ kind: 'not_found', sourceId: 'cred-private', usedByWorkflows: ['wf-2'] }]
					: [],
		}));

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: 'cred-private',
				targetMatch: 'matched',
				sourceFile: { location: 'missing' },
				consumers: [
					expect.objectContaining({ project: PROJECT_A, accessStatus: 'usable' }),
					expect.objectContaining({ project: PROJECT_B, accessStatus: 'unavailable' }),
				],
				issues: ['unavailable'],
			}),
			expect.objectContaining({
				sourceId: 'cred-wrong-type',
				expectedTypes: ['githubApi'],
				targetMatch: 'type-mismatch',
				consumers: [expect.objectContaining({ accessStatus: 'unchecked' })],
				issues: ['type-mismatch'],
			}),
		]);
		expect(credentialMatcher.match).toHaveBeenCalledTimes(2);
	});

	it('reports an unknown credential type and does not check usability for it', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [credentialNode('Odd', 'unknownApi', 'cred-1')]),
			],
		});
		credentialTypes.recognizes.mockReturnValue(false);
		credentialsRepository.findTypesByIds.mockResolvedValue([{ id: 'cred-1', type: 'unknownApi' }]);

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: 'cred-1',
				targetMatch: 'matched',
				consumers: [expect.objectContaining({ accessStatus: 'unchecked' })],
				issues: ['unknown-type'],
			}),
		]);
		expect(credentialMatcher.match).not.toHaveBeenCalled();
	});

	it('keeps a reference without an id and an id used with two types, without checking the target', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [
					credentialNode('No id', 'githubApi', null),
					credentialNode('As GitHub', 'githubApi', 'cred-1'),
				]),
				inventoryWorkflow('wf-2', PROJECT_A.id, [
					credentialNode('As GitLab', 'gitlabApi', 'cred-1'),
				]),
			],
		});

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: null,
				name: 'githubApi credential',
				expectedTypes: ['githubApi'],
				targetMatch: 'unchecked',
				consumers: [expect.objectContaining({ workflows: [workflowRef('wf-1')] })],
				issues: ['missing-id'],
			}),
			expect.objectContaining({
				sourceId: 'cred-1',
				expectedTypes: ['githubApi', 'gitlabApi'],
				targetMatch: 'unchecked',
				consumers: [
					expect.objectContaining({ workflows: [workflowRef('wf-1'), workflowRef('wf-2')] }),
				],
				issues: ['conflicting-types'],
			}),
		]);
		expect(credentialsRepository.findTypesByIds).toHaveBeenCalledWith(['cred-1']);
	});

	it('fails when a bundled credential file has another type than the workflows expect', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-1', PROJECT_A.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
			],
			credentials: [inventoryCredential('cred-1', PROJECT_A.id, 'gitlabApi')],
		});

		await expect(check()).rejects.toThrow(
			'has type "gitlabApi", but workflows use credential "cred-1" as "githubApi"',
		);
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

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: 'cred-no-file',
				name: 'githubApi credential',
				sourceFile: { location: 'missing' },
				issues: ['missing-credential', 'unknown-owner'],
			}),
			expect.objectContaining({
				sourceId: 'cred-top',
				name: 'Credential cred-top',
				sourceFile: {
					location: 'outside-project',
					filePath: 'credentials/cred-top/credential.json',
				},
				issues: ['missing-credential', 'unknown-owner'],
			}),
		]);
	});

	it('keeps one record for a missing credential used in two projects and asks for sharing', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
				inventoryWorkflow('wf-b', PROJECT_B.id, [credentialNode('GitHub', 'githubApi', 'cred-1')]),
			],
			credentials: [inventoryCredential('cred-1', PROJECT_A.id)],
		});

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: 'cred-1',
				sourceFile: expect.objectContaining({ location: 'project', project: PROJECT_A }),
				consumers: [
					expect.objectContaining({ project: PROJECT_A, workflows: [workflowRef('wf-a')] }),
					expect.objectContaining({ project: PROJECT_B, workflows: [workflowRef('wf-b')] }),
				],
				issues: ['missing-credential', 'sharing-required'],
			}),
		]);
	});

	it('surfaces missing and non-team target projects on the bindings that depend on them', async () => {
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
		});
		projectRepository.findTypesByIds.mockResolvedValue([{ id: PROJECT_B.id, type: 'personal' }]);
		credentialsRepository.findTypesByIds.mockResolvedValue([
			{ id: 'cred-existing', type: 'githubApi' },
		]);

		expect(await check()).toEqual([
			expect.objectContaining({
				sourceId: 'cred-existing',
				targetMatch: 'matched',
				consumers: [
					expect.objectContaining({
						project: PROJECT_C,
						targetProjectStatus: 'missing',
						accessStatus: 'unchecked',
					}),
				],
				issues: ['consuming-project-missing'],
			}),
			expect.objectContaining({
				sourceId: 'cred-new',
				targetMatch: 'missing',
				sourceFile: expect.objectContaining({
					project: PROJECT_B,
					targetProjectStatus: 'personal',
				}),
				consumers: [
					expect.objectContaining({ project: PROJECT_B, targetProjectStatus: 'personal' }),
				],
				issues: ['missing-credential', 'consuming-project-not-team', 'owner-project-not-team'],
			}),
			expect.objectContaining({
				kind: 'variable',
				name: 'REGION',
				consumer: expect.objectContaining({
					project: PROJECT_A,
					targetProjectStatus: 'missing',
				}),
				issues: ['missing-variable', 'consuming-project-missing', 'unknown-owner'],
			}),
		]);
		expect(credentialMatcher.match).not.toHaveBeenCalled();
	});

	it('keeps one variable record per project and records where the package bundles the name', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [
					variableNode('Set', '={{ $vars.REGION }} {{ $vars.GLOBAL_ONLY }}'),
				]),
				inventoryWorkflow('wf-b', PROJECT_B.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
			variables: [
				inventoryVariable('GLOBAL_ONLY', null),
				inventoryVariable('REGION', PROJECT_A.id),
			],
		});
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: PROJECT_B.id },
		]);

		expect(await check()).toEqual([
			expect.objectContaining({
				name: 'GLOBAL_ONLY',
				sourceFile: {
					location: 'outside-project',
					filePath: 'variables/GLOBAL_ONLY/variable.json',
				},
				consumer: expect.objectContaining({ project: PROJECT_A }),
				issues: ['missing-variable', 'unknown-owner'],
			}),
			expect.objectContaining({
				name: 'REGION',
				sourceFile: expect.objectContaining({ location: 'project', project: PROJECT_A }),
				consumer: expect.objectContaining({ project: PROJECT_A }),
				issues: ['missing-variable'],
			}),
		]);
		expect(variablesRepository.findKeysInProjectsOrGlobal).toHaveBeenCalledWith(
			['REGION', 'GLOBAL_ONLY'],
			[PROJECT_A.id, PROJECT_B.id],
		);
	});

	it('keeps a variable that only a global variable matches, marked as the fallback it is', async () => {
		useInventory({
			workflows: [
				inventoryWorkflow('wf-a', PROJECT_A.id, [variableNode('Set', '={{ $vars.REGION }}')]),
			],
			variables: [inventoryVariable('REGION', PROJECT_A.id)],
		});
		variablesRepository.findKeysInProjectsOrGlobal.mockResolvedValue([
			{ key: 'REGION', projectId: null },
		]);

		expect(await check()).toEqual([
			expect.objectContaining({
				kind: 'variable',
				name: 'REGION',
				targetMatch: 'global-fallback',
				issues: ['global-only'],
			}),
		]);
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
		});

		expect(await check()).toEqual([
			expect.objectContaining({ kind: 'credential', sourceId: 'cred-inner' }),
			expect.objectContaining({ kind: 'variable', name: 'ERROR_WF' }),
		]);
	});
});
