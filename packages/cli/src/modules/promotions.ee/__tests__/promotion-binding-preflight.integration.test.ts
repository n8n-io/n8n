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
import { createOwner } from '@test-integration/db/users';
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

function credentialNode(name: string, type: string, id: string): INode {
	return {
		...regionNode(name),
		type: 'n8n-nodes-base.github',
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
			'projects/personal/project.json': projectFile(personalProject),
			'projects/personal/workflows/w2/workflow.json': workflowFile('w2', [regionNode()]),
			'projects/gone/project.json': { id: 'proj-gone', name: 'Gone' },
			'projects/gone/workflows/w3/workflow.json': workflowFile('w3', [regionNode()]),
			'projects/fresh/project.json': { id: 'proj-fresh', name: 'Fresh' },
			'projects/fresh/workflows/w4/workflow.json': workflowFile('w4', []),
		});
		const before = await snapshot();

		const result = await service.checkDirectory({ sourceDir, user: owner });

		const alpha = { id: projectA.id, name: 'Alpha' };
		const consumerAlpha = {
			project: alpha,
			destination: 'team',
			workflows: [{ id: 'w1', name: 'Workflow w1' }],
		};
		const credentials = result.unresolvedBindings.filter((b) => b.kind === 'credential');
		const variables = result.unresolvedBindings.filter((b) => b.kind === 'variable');
		expect(credentials).toEqual([
			expect.objectContaining({
				sourceId: 'cred-in-b',
				destination: 'exists',
				consumers: [{ ...consumerAlpha, access: 'unavailable' }],
				issues: ['unavailable'],
			}),
			{
				kind: 'credential',
				sourceId: 'cred-new',
				name: 'New GitHub',
				expectedTypes: ['githubApi'],
				expressionData: { accessToken: '={{ $secrets.vault.gh }}' },
				sourcePlacement: {
					state: 'known',
					project: alpha,
					destination: 'team',
					filePath: 'projects/alpha/credentials/new/credential.json',
				},
				destination: 'absent',
				consumers: [{ ...consumerAlpha, access: 'unchecked' }],
				issues: ['absent'],
			},
			expect.objectContaining({
				sourceId: 'cred-slack',
				destination: 'type-mismatch',
				consumers: [{ ...consumerAlpha, access: 'unchecked' }],
				issues: ['type-mismatch'],
			}),
		]);
		// Sorted by project id, which is random here, so compare as a set.
		expect(variables).toHaveLength(3);
		expect(variables).toEqual(
			expect.arrayContaining([
				{
					kind: 'variable',
					name: 'REGION',
					sourcePlacement: { state: 'none' },
					consumer: consumerAlpha,
					destination: 'absent',
					issues: ['absent', 'unknown-owner'],
				},
				expect.objectContaining({
					name: 'REGION',
					consumer: expect.objectContaining({
						project: projectFile(personalProject),
						destination: 'personal',
					}),
					issues: ['absent', 'consuming-project-not-team', 'unknown-owner'],
				}),
				expect.objectContaining({
					name: 'REGION',
					consumer: expect.objectContaining({
						project: { id: 'proj-gone', name: 'Gone' },
						destination: 'absent',
					}),
					issues: ['absent', 'consuming-project-absent', 'unknown-owner'],
				}),
			]),
		);
		expect(promotionBindingPreflightResultSchema.parse(result)).toEqual(result);
		expect(await snapshot()).toEqual(before);
	});

	it('reads fresh destination state on every call and marks a global-only variable match', async () => {
		const projectA = await createTeamProject('Alpha', owner);
		await writePackage({
			'projects/alpha/project.json': projectFile(projectA),
			'projects/alpha/workflows/w1/workflow.json': workflowFile('w1', [
				credentialNode('New', 'githubApi', 'cred-new'),
			]),
			'projects/alpha/credentials/new/credential.json': {
				id: 'cred-new',
				name: 'New GitHub',
				type: 'githubApi',
			},
		});

		const first = await service.checkDirectory({ sourceDir, user: owner });
		expect(first.unresolvedBindings.map((binding) => binding.kind)).toEqual([
			'credential',
			'variable',
		]);

		await createCredentials(
			{ id: 'cred-new', name: 'New GitHub', type: 'githubApi', data: '' },
			projectA,
		);
		await createVariable('REGION', 'global');

		const second = await service.checkDirectory({ sourceDir, user: owner });
		expect(second.unresolvedBindings).toEqual([
			expect.objectContaining({
				kind: 'variable',
				name: 'REGION',
				destination: 'global',
				issues: ['global-only', 'unknown-owner'],
			}),
		]);

		await createProjectVariable('REGION', 'eu', projectA);

		expect(await service.checkDirectory({ sourceDir, user: owner })).toEqual({
			unresolvedBindings: [],
		});
	});

	it('fails on a malformed workflow file and changes nothing', async () => {
		const projectA = await createTeamProject('Alpha', owner);
		await writePackage({
			'projects/alpha/project.json': projectFile(projectA),
			'projects/alpha/workflows/w1/workflow.json': '{ "id": "w1" ',
		});
		const before = await snapshot();

		await expect(service.checkDirectory({ sourceDir, user: owner })).rejects.toThrow(
			'is not valid JSON',
		);

		expect(await snapshot()).toEqual(before);
	});

	it('rejects a missing source directory', async () => {
		await expect(
			service.checkDirectory({ sourceDir: path.join(sourceDir, 'missing'), user: owner }),
		).rejects.toThrow();
	});
});
