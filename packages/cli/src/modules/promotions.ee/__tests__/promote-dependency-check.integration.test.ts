import type { PromotionPreview } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Person, Project, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse, type INode } from 'n8n-workflow';
import { mkdtempSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import {
	buildWorkflowReferencingVariables,
	executeWorkflowNode,
} from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { saveCredential, shareCredentialWithProjects } from '@test-integration/db/credentials';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createOwnerWithApiKey, createUser } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';
import { initNodeTypes, setupTestServer } from '@test-integration/utils';

import { PromotionEnvironmentProjectRepository } from '../database/repositories/promotion-environment-project.repository';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import { PromotionChangeService } from '../promotion-change.service';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { PromotionsService } from '../promotions.service';
import { createFixtureGit } from './utils/git-remote-fixture';
import { expectPushed, insertTokenProvider } from './utils/promotion-fixtures';

const instanceFolder = mkdtempSync(path.join(tmpdir(), 'promote-dependencies-'));
const emptyRemoteSeed = path.join(instanceFolder, 'empty-remote.git');
Container.set(
	PromotionWorkingDirectoryService,
	new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder: instanceFolder })),
);
mockInstance(ActiveWorkflowManager);
const server = setupTestServer({
	reuseServer: true,
	endpointGroups: ['publicApi'],
	modules: ['promotions', 'n8n-packages', 'data-table'],
	enabledFeatures: ['feat:promotions', 'feat:projectRole:admin', 'feat:folders'],
});

const PROMOTE_OPTIONS = { canExportVariableValues: true };

let remoteRoot: string;
let owner: Person;
let alpha: Project;
let beta: Project;

beforeAll(async () => {
	await initNodeTypes();
	await createFixtureGit().raw(['init', '--bare', '--initial-branch=main', emptyRemoteSeed]);
});

beforeEach(async () => {
	await disconnectEnvironments();
	await testDb.truncate([
		'CredentialsEntity',
		'SharedCredentials',
		'WorkflowEntity',
		'SharedWorkflow',
		'Folder',
		'ProjectRelation',
		'Project',
		'Variables',
	]);
	await Container.get(VariablesService).updateCache();
	remoteRoot = await mkdtemp(path.join(tmpdir(), 'promote-dependencies-remote-'));
	owner = await createOwnerWithApiKey();
	alpha = await createTeamProject('Alpha team', owner);
	beta = await createTeamProject('Beta team', owner);
});

afterEach(async () => {
	await rm(remoteRoot, { recursive: true, force: true });
});

afterAll(async () => {
	await rm(instanceFolder, { recursive: true, force: true });
});

async function disconnectEnvironments() {
	await Container.get(PromotionRunRepository).delete({});
	await Container.get(PromotionEnvironmentProjectRepository).delete({});
	await Container.get(PromotionEnvironmentRepository).delete({});
	await Container.get(PromotionProviderRepository).delete({});
}

/** Points the instance Promote environment at `main` of a new empty remote. */
async function connectNewRemote(name: string) {
	const remoteUrl = path.join(remoteRoot, `${name}.git`);
	await cp(emptyRemoteSeed, remoteUrl, { recursive: true });
	const provider = await insertTokenProvider({ name });
	const environment = await Container.get(PromotionEnvironmentRepository).insertEnvironment({
		name,
		scope: 'instance',
		providerId: provider.id,
		remote: { schemaVersion: 1, remoteUrl },
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
	});
	await Container.get(PromotionsService).clone(environment.id, owner);
	return { remoteUrl, environment };
}

/** The path and the blob of every file on `main`. Empty when the branch does not exist. */
async function branchTree(remoteUrl: string): Promise<string> {
	const git = createFixtureGit(remoteUrl);
	const refs = await git.raw(['for-each-ref', 'refs/heads/main']);
	return refs === '' ? '' : await git.raw(['ls-tree', '-r', 'main']);
}

type RawManifest = {
	credentials?: Array<{ id: string; target: string }>;
	requirements?: { credentials?: object[]; workflows?: object[] };
};

async function branchManifest(remoteUrl: string): Promise<RawManifest> {
	return jsonParse<RawManifest>(
		await createFixtureGit(remoteUrl).raw(['show', 'main:n8n/manifest.json']),
	);
}

async function previewOf(user: User, projectId: string) {
	return await Container.get(PromotionChangeService).getPreview(user, projectId, 'promote');
}

async function saveHeaderCredential(name: string, ownerProject: Project) {
	return await saveCredential(
		{ name, type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'secret' } },
		{ project: ownerProject, role: 'credential:owner' },
	);
}

/** `name` is the name that the node holds. It can differ from the name of the credential. */
function headerAuthNode({ id, name }: { id: string; name: string }): INode {
	return {
		id: `node-${id}`,
		name: `Request ${id}`,
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: { url: 'https://example.com' },
		credentials: { httpHeaderAuth: { id, name } },
	};
}

/** `Sync` of Alpha uses a credential of Beta that Alpha shares, and calls `Notify` of Beta. */
async function seedCrossProjectUse() {
	const credential = await saveHeaderCredential('CRM key', beta);
	await shareCredentialWithProjects(credential, [alpha]);
	const subWorkflow = await createWorkflow({ name: 'Notify', nodes: [], connections: {} }, beta);
	const caller = await createWorkflow(
		{
			name: 'Sync',
			nodes: [headerAuthNode(credential), executeWorkflowNode(subWorkflow.id)],
			connections: {},
		},
		alpha,
	);
	return { credential, subWorkflow, caller };
}

const consumersOf = (workflow: { id: string; name: string }) => [
	{
		project: { id: alpha.id, name: alpha.name },
		workflows: [{ id: workflow.id, name: workflow.name }],
	},
];

const byId = <T extends { id?: string }>(entries: T[] | undefined, id: string) =>
	entries?.find((entry) => entry.id === id);

/** The two lists must not show the project that owns a dependency. */
function expectNoTraceOf(
	project: Project,
	{ missingDependencies, warnings }: Pick<PromotionPreview, 'missingDependencies' | 'warnings'>,
) {
	const shown = JSON.stringify([missingDependencies, warnings]);
	expect(shown).not.toContain(project.id);
	expect(shown).not.toContain(project.name);
}

describe('Missing dependencies of a project Promote', () => {
	it('lists what the project uses from another project, and writes the same branch as a Promote without a preview', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const ownCredential = await saveHeaderCredential('Own key', alpha);
		const ownSubWorkflow = await createWorkflow({ name: 'Own helper', nodes: [] }, alpha);
		const local = await createWorkflow(
			{
				name: 'Local',
				nodes: [headerAuthNode(ownCredential), executeWorkflowNode(ownSubWorkflow.id)],
				connections: {},
			},
			alpha,
		);
		const selection = { workflowIds: [caller.id, local.id, ownSubWorkflow.id] };
		const reviewed = await connectNewRemote('reviewed');

		const response = await server
			.publicApiAgentFor(owner)
			.get(`/promotions/projects/${alpha.id}/changes/promote`)
			.expect(200);
		const preview: PromotionPreview = response.body;

		// The credential and the sub-workflow of Alpha itself are not in the lists.
		expect(preview.missingDependencies).toHaveLength(2);
		expect(byId(preview.missingDependencies, credential.id)).toEqual({
			kind: 'credential',
			id: credential.id,
			name: 'CRM key',
			credentialType: 'httpHeaderAuth',
			group: 'other-project',
			reason: 'not-on-branch',
			accessible: true,
			blocking: false,
			consumers: consumersOf(caller),
		});
		expect(byId(preview.missingDependencies, subWorkflow.id)).toEqual({
			kind: 'workflow',
			id: subWorkflow.id,
			name: 'Notify',
			group: 'other-project',
			reason: 'not-on-branch',
			accessible: true,
			blocking: false,
			consumers: consumersOf(caller),
		});
		expect(preview.warnings).toEqual([]);
		expectNoTraceOf(beta, preview);
		expect((await previewOf(owner, alpha.id)).revision).toBe(preview.revision);

		const afterPreview = await Container.get(PromotionsService).promoteProjectSelection(
			alpha.id,
			owner,
			{ ...selection, ...PROMOTE_OPTIONS, expectedPreviewRevision: preview.revision },
		);
		expectPushed(afterPreview);
		const reviewedTree = await branchTree(reviewed.remoteUrl);

		await disconnectEnvironments();
		const direct = await connectNewRemote('direct');
		const withoutPreview = await Container.get(PromotionsService).promoteProjectSelection(
			alpha.id,
			owner,
			{ ...selection, ...PROMOTE_OPTIONS },
		);
		expectPushed(withoutPreview);

		expect(reviewedTree).not.toBe('');
		expect(await branchTree(direct.remoteUrl)).toBe(reviewedTree);
		expect(withoutPreview.counts).toEqual(afterPreview.counts);
		const { requirements } = await branchManifest(direct.remoteUrl);
		expect(requirements?.credentials).toHaveLength(2);
		for (const row of requirements?.credentials ?? []) {
			expect(Object.keys(row).sort()).toEqual(['id', 'name', 'type', 'usedBy']);
		}
		expect(requirements?.workflows).toHaveLength(2);
		for (const row of requirements?.workflows ?? []) {
			expect(Object.keys(row).sort()).toEqual(['id', 'name', 'usedBy']);
		}
	}, 60_000);

	it('stops listing a dependency when the branch holds it under its project, and changes the revision', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const { remoteUrl } = await connectNewRemote('branch');
		const promotions = Container.get(PromotionsService);
		expectPushed(
			await promotions.promoteProjectSelection(alpha.id, owner, {
				workflowIds: [caller.id],
				...PROMOTE_OPTIONS,
			}),
		);

		// The Promote of Alpha wrote the credential as a top-level file, which has no owner project.
		const topLevel = byId((await branchManifest(remoteUrl)).credentials, credential.id);
		expect(topLevel?.target.startsWith('credentials/')).toBe(true);
		const before = await previewOf(owner, alpha.id);
		expect(before.missingDependencies?.map(({ id }) => id).sort()).toEqual(
			[credential.id, subWorkflow.id].sort(),
		);

		expectPushed(
			await promotions.promoteProjectSelection(beta.id, owner, {
				workflowIds: [subWorkflow.id],
				credentialIds: [credential.id],
				...PROMOTE_OPTIONS,
			}),
		);

		const after = await previewOf(owner, alpha.id);
		expect(after.missingDependencies).toEqual([]);
		expect(after.warnings).toEqual([]);
		expect(after.revision).not.toBe(before.revision);
		// A Promote that reviewed the old lists stops.
		expect(
			await promotions.promoteProjectSelection(alpha.id, owner, {
				workflowIds: [caller.id],
				...PROMOTE_OPTIONS,
				expectedPreviewRevision: before.revision,
			}),
		).toMatchObject({ status: 'preview-changed' });
	}, 60_000);

	it('stops listing a dependency when the workflow no longer uses it, and changes the revision', async () => {
		const { caller } = await seedCrossProjectUse();
		await connectNewRemote('branch');
		const before = await previewOf(owner, alpha.id);
		expect(before.missingDependencies).toHaveLength(2);

		await Container.get(WorkflowRepository).update(caller.id, { nodes: [] });

		const after = await previewOf(owner, alpha.id);
		expect(after.missingDependencies).toEqual([]);
		expect(after.revision).not.toBe(before.revision);
	}, 60_000);

	it('shows a user without access to the other project only what the workflow shows', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		// Alpha does not share this credential of Beta, and the node holds an old name of it.
		const hidden = await saveHeaderCredential('Beta billing key', beta);
		const legacy = await createWorkflow(
			{
				name: 'Legacy',
				nodes: [headerAuthNode({ id: hidden.id, name: 'Old key name' })],
				connections: {},
			},
			alpha,
		);
		const promoter = await createUser({
			role: await createCustomRoleWithScopeSlugs(['promotions:promote'], { roleType: 'global' }),
		});
		const projectRole = await createCustomRoleWithScopeSlugs(
			[
				'project:read',
				'project:list',
				'project:export',
				'folder:read',
				'folder:list',
				'workflow:read',
				'workflow:list',
				'workflow:export',
				'credential:read',
				'credential:list',
			],
			{ roleType: 'project' },
		);
		await linkUserToProject(promoter, alpha, projectRole.slug);
		await connectNewRemote('branch');

		const preview = await previewOf(promoter, alpha.id);

		const outsideAccess = {
			group: 'outside-access',
			reason: 'not-on-branch',
			accessible: false,
			blocking: false,
		};
		expect(preview.missingDependencies).toHaveLength(3);
		expect(byId(preview.missingDependencies, credential.id)).toEqual({
			kind: 'credential',
			id: credential.id,
			name: 'CRM key',
			credentialType: 'httpHeaderAuth',
			...outsideAccess,
			consumers: consumersOf(caller),
		});
		expect(byId(preview.missingDependencies, hidden.id)).toEqual({
			kind: 'credential',
			id: hidden.id,
			name: 'Old key name',
			credentialType: 'httpHeaderAuth',
			...outsideAccess,
			consumers: consumersOf(legacy),
		});
		// The node holds only the id of the sub-workflow.
		expect(byId(preview.missingDependencies, subWorkflow.id)).toEqual({
			kind: 'workflow',
			id: subWorkflow.id,
			name: subWorkflow.id,
			...outsideAccess,
			consumers: consumersOf(caller),
		});
		expectNoTraceOf(beta, preview);
		const shown = JSON.stringify([preview.missingDependencies, preview.warnings]);
		expect(shown).not.toContain('Beta billing key');
		expect(shown).not.toContain('Notify');

		const ownerPreview = await previewOf(owner, alpha.id);
		expect(ownerPreview.missingDependencies).toHaveLength(3);
		for (const entry of ownerPreview.missingDependencies ?? []) {
			expect(entry).toMatchObject({ group: 'other-project', accessible: true });
		}
		expectNoTraceOf(beta, ownerPreview);
	}, 60_000);

	it('warns about references to something that this instance does not hold, and still promotes', async () => {
		const deletedCredential = await saveHeaderCredential('Deleted key', beta);
		const deletedSubWorkflow = await createWorkflow({ name: 'Deleted helper', nodes: [] }, beta);
		const broken = await createWorkflow(
			{
				name: 'Broken',
				nodes: [headerAuthNode(deletedCredential), executeWorkflowNode(deletedSubWorkflow.id)],
				connections: {},
			},
			alpha,
		);
		await createVariable('defined_region', 'eu');
		const usesVariables = await buildWorkflowReferencingVariables({
			name: 'Regions',
			project: alpha,
			variableNames: ['defined_region', 'missing_region'],
		});
		await Container.get(WorkflowRepository).delete(deletedSubWorkflow.id);
		await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);
		await connectNewRemote('branch');

		const preview = await previewOf(owner, alpha.id);

		expect(preview.missingDependencies).toEqual([]);
		expect(preview.warnings).toEqual([
			{
				kind: 'credential',
				code: 'missing-on-source',
				id: deletedCredential.id,
				name: 'Deleted key',
				blocking: false,
				consumers: consumersOf(broken),
			},
			{
				kind: 'variable',
				code: 'missing-on-source',
				name: 'missing_region',
				blocking: false,
				consumers: consumersOf(usesVariables),
			},
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: deletedSubWorkflow.id,
				name: deletedSubWorkflow.id,
				blocking: false,
				consumers: consumersOf(broken),
			},
		]);

		expectPushed(
			await Container.get(PromotionsService).promoteProjectSelection(alpha.id, owner, {
				workflowIds: [broken.id, usesVariables.id],
				...PROMOTE_OPTIONS,
				expectedPreviewRevision: preview.revision,
			}),
		);
	}, 60_000);
});

describe('Missing dependencies of an instance Promote', () => {
	const checkPath = (environmentId: string) =>
		`/promotions/environments/${environmentId}/promote/check`;

	it('lists a sub-workflow of a personal project as blocking, and the Promote still stops on it', async () => {
		const personalSubWorkflow = await createWorkflow({ name: 'My helper', nodes: [] }, owner);
		const personalCredential = await saveCredential(
			{ name: 'My key', type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'secret' } },
			{ user: owner, role: 'credential:owner' },
		);
		const caller = await createWorkflow(
			{
				name: 'Caller',
				nodes: [headerAuthNode(personalCredential), executeWorkflowNode(personalSubWorkflow.id)],
				connections: {},
			},
			alpha,
		);
		const { remoteUrl, environment } = await connectNewRemote('branch');

		const response = await server
			.publicApiAgentFor(owner)
			.get(checkPath(environment.id))
			.expect(200);

		expect(response.body).toEqual({
			missingDependencies: [
				{
					kind: 'credential',
					id: personalCredential.id,
					name: 'My key',
					credentialType: 'httpHeaderAuth',
					group: 'personal',
					reason: 'personal-project',
					accessible: true,
					blocking: false,
					consumers: consumersOf(caller),
				},
				{
					kind: 'workflow',
					id: personalSubWorkflow.id,
					name: 'My helper',
					group: 'personal',
					reason: 'personal-project',
					accessible: true,
					blocking: true,
					consumers: consumersOf(caller),
				},
			],
			warnings: [],
			revision: expect.any(String),
		});
		expectNoTraceOf(await getPersonalProject(owner), response.body);

		await expect(
			Container.get(PromotionsService).promote(environment.id, owner, PROMOTE_OPTIONS),
		).rejects.toThrow('1 workflow dependency not included in the package. Export aborted.');
		expect(await branchTree(remoteUrl)).toBe('');
	}, 60_000);

	it('does not list what another team project holds, because the same Promote writes it', async () => {
		const { subWorkflow, caller } = await seedCrossProjectUse();
		const { remoteUrl, environment } = await connectNewRemote('branch');
		const agent = server.publicApiAgentFor(owner);

		const check = await agent.get(checkPath(environment.id)).expect(200);

		expect(check.body).toEqual({
			missingDependencies: [],
			warnings: [],
			revision: expect.any(String),
		});
		expect((await agent.get(checkPath(environment.id)).expect(200)).body).toEqual(check.body);

		await Container.get(PromotionsService).promote(environment.id, owner, PROMOTE_OPTIONS);
		expect(await branchTree(remoteUrl)).not.toBe('');

		// The revision follows the lists.
		await Container.get(WorkflowRepository).delete(subWorkflow.id);
		const afterDelete = await agent.get(checkPath(environment.id)).expect(200);
		expect(afterDelete.body.warnings).toEqual([
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: subWorkflow.id,
				name: subWorkflow.id,
				blocking: true,
				consumers: consumersOf(caller),
			},
		]);
		expect(afterDelete.body.revision).not.toBe(check.body.revision);
	}, 60_000);

	it('refuses an API key without the promotions:promote scope', async () => {
		const { environment } = await connectNewRemote('branch');
		const reader = await createOwnerWithApiKey({ scopes: ['promotions:read'] });

		await server.publicApiAgentFor(reader).get(checkPath(environment.id)).expect(403);
	}, 60_000);

	it('refuses an environment that is not an instance Promote environment', async () => {
		const { environment } = await connectNewRemote('branch');
		const projectEnvironment = await Container.get(
			PromotionEnvironmentRepository,
		).insertEnvironment({
			name: 'Project',
			scope: 'projects',
			providerId: environment.providerId,
			remote: environment.remote,
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
		});

		await server.publicApiAgentFor(owner).get(checkPath(projectEnvironment.id)).expect(400);
	}, 60_000);
});
