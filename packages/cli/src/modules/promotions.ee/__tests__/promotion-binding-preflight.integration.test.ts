import { promotionBindingPreflightResultSchema } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialTypes } from '@/credential-types';
import { createCredentials } from '@test-integration/db/credentials';
import { createOwner, createMember } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';

import { PromotionBindingPreflightService } from '../promotion-binding-preflight.service';

let owner: User;
let service: PromotionBindingPreflightService;
let sourceDir: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'promotions']);
	await testDb.init();
	mockInstance(CredentialTypes).recognizes.mockReturnValue(true);
	service = Container.get(PromotionBindingPreflightService);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'SharedCredentials',
		'CredentialsEntity',
		'ProjectRelation',
		'Project',
		'Variables',
	]);
	owner = await createOwner();
	sourceDir = await mkdtemp(path.join(tmpdir(), 'promotion-preflight-'));
});

afterEach(async () => {
	await rm(sourceDir, { recursive: true, force: true });
});

afterAll(async () => {
	await testDb.terminate();
});

async function writePackage(files: Record<string, unknown>) {
	for (const [relativePath, content] of Object.entries(files)) {
		const target = path.join(sourceDir, relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, typeof content === 'string' ? content : JSON.stringify(content));
	}
}

const projectFile = (project: Pick<Project, 'id' | 'name'>) => ({
	id: project.id,
	name: project.name,
});

function workflowFile(id: string, nodes: INode[]) {
	return {
		id,
		name: `Workflow ${id}`,
		nodes,
		connections: {},
		versionId: 'v1',
		parentFolderId: null,
		isArchived: false,
	};
}

/** A node that needs the `REGION` variable and nothing else. */
function regionNode(name = 'Region'): INode {
	return {
		id: `node-${name}`,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: { note: '={{ $vars.REGION }}' },
	};
}

/** A node that needs one credential and nothing else. */
function credentialNode(name: string, type: string, id: string): INode {
	return {
		id: `node-${name}`,
		name,
		type: 'n8n-nodes-base.github',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { [type]: { id, name } },
	};
}

/** Everything pre-flight must leave alone: database rows and package files. */
async function snapshot() {
	const [projects, credentials, sharedCredentials, variables, workflows] = await Promise.all([
		Container.get(ProjectRepository).find(),
		Container.get(CredentialsRepository).find(),
		Container.get(SharedCredentialsRepository).find(),
		Container.get(VariablesRepository).find({ relations: ['project'] }),
		Container.get(WorkflowRepository).find(),
	]);
	const files: Record<string, string> = {};
	for (const entry of await readdir(sourceDir, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const absolute = path.join(entry.parentPath, entry.name);
		files[path.relative(sourceDir, absolute)] = await readFile(absolute, 'utf-8');
	}
	return { projects, credentials, sharedCredentials, variables, workflows, files };
}

describe('PromotionBindingPreflightService (directory + database)', () => {
	it.each([
		{ scope: 'selected workflow', withSelection: true },
		{ scope: 'whole package without a selection', withSelection: false },
	])('reports missing bindings for the $scope', async ({ withSelection }) => {
		const project = projectFile(await createTeamProject('Alpha', owner));
		await writePackage({
			'projects/alpha/project.json': project,
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				credentialNode('Selected', 'githubApi', 'cred-selected'),
				regionNode(),
			]),
			'projects/alpha/workflows/w2/workflow.json': workflowFile('w2', [
				credentialNode('Unselected', 'githubApi', 'cred-unselected'),
				{ ...regionNode(), parameters: { note: '={{ $vars.OTHER_REGION }}' } },
			]),
			'projects/alpha/credentials/selected/credential.json': {
				id: 'cred-selected',
				name: 'Selected',
				type: 'githubApi',
			},
			'projects/alpha/credentials/unselected/credential.json': {
				id: 'cred-unselected',
				name: 'Unselected',
				type: 'githubApi',
			},
			'projects/alpha/variables/region/variable.json': { name: 'REGION', type: 'string' },
			'projects/alpha/variables/other-region/variable.json': {
				name: 'OTHER_REGION',
				type: 'string',
			},
		});

		const result = await service.checkDirectory({
			sourceDir,
			...(withSelection
				? { selection: { selectedProjectId: project.id, selectedWorkflowIds: ['w1'] } }
				: {}),
		});

		const selectedConsumer = { project, workflows: [{ id: 'w1', name: 'Workflow w1' }] };
		const unselectedConsumer = { project, workflows: [{ id: 'w2', name: 'Workflow w2' }] };
		const selectedCredential = {
			kind: 'credential',
			sourceId: 'cred-selected',
			name: 'Selected',
			credentialType: 'githubApi',
			ownerProject: project,
			consumers: [selectedConsumer],
		};
		const unselectedCredential = {
			kind: 'credential',
			sourceId: 'cred-unselected',
			name: 'Unselected',
			credentialType: 'githubApi',
			ownerProject: project,
			consumers: [unselectedConsumer],
		};
		const selectedVariable = {
			kind: 'variable',
			name: 'REGION',
			variableType: 'string',
			scope: { kind: 'project', project },
			consumers: [selectedConsumer],
		};
		const unselectedVariable = {
			kind: 'variable',
			name: 'OTHER_REGION',
			variableType: 'string',
			scope: { kind: 'project', project },
			consumers: [unselectedConsumer],
		};
		expect(result).toEqual({
			missingProjects: [],
			missingBindings: withSelection
				? [selectedCredential, selectedVariable]
				: [selectedCredential, unselectedCredential, unselectedVariable, selectedVariable],
			accessRequirements: [],
			conflicts: [],
			warnings: [],
		});
	});

	it('reports a missing binding when a selected workflow needs a credential owned by another package project', async () => {
		const projectA = projectFile(await createTeamProject('Alpha', owner));
		const beta = { id: 'proj-beta', name: 'Beta' };
		await writePackage({
			'projects/alpha/project.json': projectA,
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				credentialNode('Cross', 'githubApi', 'cred-cross'),
			]),
			'projects/beta/project.json': beta,
			'projects/beta/credentials/cross/credential.json': {
				id: 'cred-cross',
				name: 'Cross',
				type: 'githubApi',
			},
		});
		const before = await snapshot();

		const result = await service.checkDirectory({
			sourceDir,
			selection: { selectedProjectId: projectA.id, selectedWorkflowIds: ['w1'] },
		});

		expect(result.missingProjects).toEqual([]);
		expect(result.missingBindings).toEqual([
			{
				kind: 'credential',
				sourceId: 'cred-cross',
				name: 'Cross',
				credentialType: 'githubApi',
				ownerProject: beta,
				consumers: [{ project: projectA, workflows: [{ id: 'w1', name: 'Workflow w1' }] }],
			},
		]);
		expect(result.conflicts).toEqual([]);
		expect(promotionBindingPreflightResultSchema.parse(result)).toEqual(result);
		expect(await snapshot()).toEqual(before);
	});

	it('matches credentials by id in the consuming project and variables by name in the project', async () => {
		// `REGION` exists only in Beta, so Alpha's requirement stays unresolved.
		const projectA = await createTeamProject('Alpha', owner);
		const projectB = await createTeamProject('Beta', owner);
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		await createCredentials(
			{ id: 'cred-in-a', name: 'In A', type: 'githubApi', data: '' },
			projectA,
		);
		await createCredentials(
			{ id: 'cred-in-b', name: 'In B', type: 'githubApi', data: '' },
			projectB,
		);
		await createCredentials(
			{ id: 'cred-slack', name: 'Slack', type: 'slackApi', data: '' },
			projectA,
		);
		await createProjectVariable('REGION', 'beta', projectB);

		await writePackage({
			'manifest.json': '{ "stale": true',
			'projects/alpha/project.json': projectFile(projectA),
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				regionNode(),
				credentialNode('Usable', 'githubApi', 'cred-in-a'),
				credentialNode('Other project', 'githubApi', 'cred-in-b'),
				credentialNode('Wrong type', 'githubApi', 'cred-slack'),
				credentialNode('New', 'githubApi', 'cred-new'),
			]),
			'projects/alpha/credentials/new/credential.json': {
				id: 'cred-new',
				name: 'New GitHub',
				type: 'githubApi',
				data: { accessToken: '={{ $secrets.vault.gh }}' },
			},
			'projects/alpha/variables/region/variable.json': {
				name: 'REGION',
				type: 'string',
				value: 'source',
			},
			'projects/personal/project.json': projectFile(personalProject),
			'projects/personal/workflows/w2/workflow.json': workflowFile('w2', [regionNode()]),
			'projects/gone/project.json': { id: 'proj-gone', name: 'Gone' },
			'projects/gone/workflows/w3/workflow.json': workflowFile('w3', [regionNode()]),
			'projects/fresh/project.json': { id: 'proj-fresh', name: 'Fresh' },
			'projects/fresh/workflows/w4/workflow.json': workflowFile('w4', []),
		});
		const before = await snapshot();

		const result = await service.checkDirectory({ sourceDir });

		const alpha = { id: projectA.id, name: 'Alpha' };
		const consumerAlpha = {
			project: alpha,
			workflows: [{ id: 'w1', name: 'Workflow w1' }],
		};
		expect(result.missingBindings).toEqual([
			{
				kind: 'credential',
				sourceId: 'cred-new',
				name: 'New GitHub',
				credentialType: 'githubApi',
				expressionData: { accessToken: '={{ $secrets.vault.gh }}' },
				ownerProject: alpha,
				consumers: [consumerAlpha],
			},
			{
				kind: 'variable',
				name: 'REGION',
				variableType: 'string',
				scope: { kind: 'project', project: alpha },
				sourceValue: 'source',
				consumers: [consumerAlpha],
			},
		]);
		expect(result.accessRequirements).toEqual([
			{
				kind: 'credential',
				code: 'access-required',
				sourceId: 'cred-in-b',
				name: 'Other project',
				credentialType: 'githubApi',
				consumers: [consumerAlpha],
			},
		]);
		expect(result.conflicts).toEqual([
			expect.objectContaining({
				kind: 'project',
				code: 'project-not-team',
				project: projectFile(personalProject),
			}),
			expect.objectContaining({
				kind: 'credential',
				code: 'type-mismatch',
				sourceId: 'cred-slack',
				targetType: 'slackApi',
				consumers: [consumerAlpha],
			}),
			expect.objectContaining({
				kind: 'variable',
				code: 'missing-definition',
				name: 'REGION',
				consumers: expect.arrayContaining([
					{ project: projectFile(personalProject), workflows: [{ id: 'w2', name: 'Workflow w2' }] },
					{
						project: { id: 'proj-gone', name: 'Gone' },
						workflows: [{ id: 'w3', name: 'Workflow w3' }],
					},
				]),
			}),
		]);
		expect(
			result.conflicts.find((conflict) => conflict.code === 'missing-definition')?.consumers,
		).toHaveLength(2);
		expect(result.warnings).toEqual([]);
		expect(promotionBindingPreflightResultSchema.parse(result)).toEqual(result);
		expect(await snapshot()).toEqual(before);
	});

	it('reads fresh target state and preserves the source variable scope', async () => {
		const projectA = await createTeamProject('Alpha', owner);
		await writePackage({
			'projects/alpha/variables/region/variable.json': {
				name: 'REGION',
				type: 'string',
				value: 'source',
			},
			'projects/alpha/project.json': projectFile(projectA),
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				regionNode(),
				credentialNode('New', 'githubApi', 'cred-new'),
			]),
			'projects/alpha/credentials/new/credential.json': {
				id: 'cred-new',
				name: 'New GitHub',
				type: 'githubApi',
			},
		});

		const first = await service.checkDirectory({ sourceDir });
		expect(first).toMatchObject({ accessRequirements: [], conflicts: [], warnings: [] });
		expect(first.missingBindings.map((binding) => binding.kind)).toEqual([
			'credential',
			'variable',
		]);

		await createCredentials(
			{ id: 'cred-new', name: 'New GitHub', type: 'githubApi', data: '' },
			projectA,
		);
		await createVariable('REGION', 'global');

		const second = await service.checkDirectory({ sourceDir });
		expect(second).toMatchObject({ accessRequirements: [], conflicts: [], warnings: [] });
		expect(second.missingBindings).toEqual([
			expect.objectContaining({
				kind: 'variable',
				name: 'REGION',
				scope: { kind: 'project', project: projectFile(projectA) },
				sourceValue: 'source',
			}),
		]);

		await createProjectVariable('REGION', 'eu', projectA);

		expect(await service.checkDirectory({ sourceDir })).toEqual({
			missingProjects: [],
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
			warnings: [],
		});
	});

	it('checks grants for each project and reads only requested facts', async () => {
		const member = await createMember();
		const alpha = await createTeamProject('Alpha', member);
		const beta = await createTeamProject('Beta', member);
		const unrelated = await createTeamProject('Unrelated', owner);
		const credential = await createCredentials(
			{ id: 'cred-shared', name: 'Shared', type: 'githubApi', data: 'target-secret' },
			unrelated,
		);
		await Container.get(SharedCredentialsRepository).save({
			credentialsId: credential.id,
			projectId: alpha.id,
			role: 'credential:user',
		});
		await createCredentials(
			{ id: 'cred-unrelated', name: 'Private', type: 'slackApi', data: 'private-secret' },
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id),
		);
		await writePackage({
			'projects/alpha/project.json': projectFile(alpha),
			'projects/beta/project.json': projectFile(beta),
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				credentialNode('Shared', 'githubApi', credential.id),
			]),
			'projects/beta/workflows/w2/workflow.json': workflowFile('w2', [
				credentialNode('Shared', 'githubApi', credential.id),
			]),
		});
		const before = await snapshot();
		const expected = {
			missingProjects: [],
			missingBindings: [],
			conflicts: [],
			warnings: [],
			accessRequirements: [
				{
					kind: 'credential',
					code: 'access-required',
					sourceId: credential.id,
					name: 'Shared',
					credentialType: 'githubApi',
					consumers: [
						{ project: projectFile(beta), workflows: [{ id: 'w2', name: 'Workflow w2' }] },
					],
				},
			],
		};
		expect(await service.checkDirectory({ sourceDir })).toEqual(expected);
		expect(
			await Container.get(CredentialsRepository).findPromotionBindingAccess(
				[credential.id],
				[alpha.id, beta.id],
			),
		).toEqual([
			{
				id: credential.id,
				type: 'githubApi',
				usageScope: 'project',
				isGlobal: false,
				projectIds: [alpha.id],
			},
		]);
		expect(await snapshot()).toEqual(before);
	});

	it('checks global availability and workflow eligibility for new projects', async () => {
		const global = await createCredentials(
			{ id: 'cred-global', name: 'Global', type: 'githubApi', data: '', isGlobal: true },
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id),
		);
		await createCredentials(
			{
				id: 'cred-instance',
				name: 'Instance',
				type: 'githubApi',
				data: '',
				isGlobal: true,
				usageScope: 'instance',
			},
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id),
		);
		await createCredentials(
			{ id: 'cred-local', name: 'Local', type: 'githubApi', data: '' },
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id),
		);
		await writePackage({
			'projects/new/project.json': { id: 'proj-new', name: 'New' },
			'projects/new/workflows/w1/workflow.json': workflowFile('w1', [
				credentialNode('Global', 'githubApi', global.id),
				credentialNode('Instance', 'githubApi', 'cred-instance'),
				credentialNode('Local', 'githubApi', 'cred-local'),
			]),
		});
		const before = await snapshot();
		const result = await service.checkDirectory({ sourceDir });
		expect(result).toEqual({
			missingProjects: [{ id: 'proj-new', name: 'New' }],
			missingBindings: [],
			warnings: [],
			accessRequirements: [
				expect.objectContaining({
					sourceId: 'cred-local',
					code: 'access-required',
					consumers: [
						{
							project: { id: 'proj-new', name: 'New' },
							workflows: [{ id: 'w1', name: 'Workflow w1' }],
						},
					],
				}),
			],
			conflicts: [
				expect.objectContaining({
					sourceId: 'cred-instance',
					code: 'incompatible-usage-scope',
					usageScope: 'instance',
				}),
			],
		});
		expect(
			await Container.get(CredentialsRepository).findPromotionBindingAccess([global.id], []),
		).toEqual([
			{ id: global.id, type: 'githubApi', isGlobal: true, usageScope: 'project', projectIds: [] },
		]);
		expect(await snapshot()).toEqual(before);
	});

	it('returns one global binding and a shadowing warning without target values', async () => {
		const alpha = await createTeamProject('Alpha', owner);
		const beta = await createTeamProject('Beta', owner);
		await createProjectVariable('REGION', 'target-project-value', alpha);
		await writePackage({
			'projects/alpha/project.json': projectFile(alpha),
			'projects/beta/project.json': projectFile(beta),
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [regionNode()]),
			'projects/beta/workflows/w2/workflow.json': workflowFile('w2', [regionNode()]),
			'variables/region/variable.json': { name: 'REGION', type: 'string', value: '' },
		});
		const first = await service.checkDirectory({ sourceDir });
		expect(first).toMatchObject({ accessRequirements: [], conflicts: [] });
		expect(first.missingBindings[0].consumers).toHaveLength(2);
		expect(first.missingBindings).toEqual([
			{
				kind: 'variable',
				name: 'REGION',
				variableType: 'string',
				scope: { kind: 'global' },
				sourceValue: '',
				consumers: expect.arrayContaining([
					{ project: projectFile(alpha), workflows: [{ id: 'w1', name: 'Workflow w1' }] },
					{ project: projectFile(beta), workflows: [{ id: 'w2', name: 'Workflow w2' }] },
				]),
			},
		]);
		expect(first.warnings).toEqual([
			{
				kind: 'variable',
				code: 'variable-shadowed',
				name: 'REGION',
				scope: { kind: 'global' },
				consumers: [
					{ project: projectFile(alpha), workflows: [{ id: 'w1', name: 'Workflow w1' }] },
				],
			},
		]);
		await createVariable('REGION', 'target-global-value');
		const before = await snapshot();
		expect(await service.checkDirectory({ sourceDir })).toEqual({
			missingProjects: [],
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
			warnings: first.warnings,
		});
		expect(
			await Container.get(VariablesRepository).findKeysInProjectsOrGlobal(['REGION'], []),
		).toEqual([{ key: 'REGION', projectId: null }]);
		expect(await snapshot()).toEqual(before);
	});

	it('fails on a malformed workflow file and changes nothing', async () => {
		const projectA = await createTeamProject('Alpha', owner);
		await writePackage({
			'projects/alpha/project.json': projectFile(projectA),
			'projects/alpha/workflows/w1/workflow.json': '{ "id": "w1" ',
		});
		const before = await snapshot();

		await expect(service.checkDirectory({ sourceDir })).rejects.toThrow('is not valid JSON');

		expect(await snapshot()).toEqual(before);
	});

	it('rejects a missing source directory', async () => {
		await expect(
			service.checkDirectory({ sourceDir: path.join(sourceDir, 'missing') }),
		).rejects.toThrow();
	});
});
