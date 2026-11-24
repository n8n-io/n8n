import type { PromoteRequest, PromotionPreview } from '@n8n/api-types';
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
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
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

async function branchHead(remoteUrl: string): Promise<string> {
	return await createFixtureGit(remoteUrl).raw(['for-each-ref', 'refs/heads/main']);
}

async function headCommitMessage(remoteUrl: string): Promise<string> {
	return await createFixtureGit(remoteUrl).raw(['log', '-1', '--format=%B', 'main']);
}

async function branchFile(remoteUrl: string, filePath: string): Promise<string> {
	return await createFixtureGit(remoteUrl).raw(['show', `main:${filePath}`]);
}

type RawRow = { id: string; reason?: string; usedBy: object[] };
type RawManifest = {
	workflows?: Array<{ id: string; target: string }>;
	credentials?: Array<{ id: string; target: string }>;
	requirements?: {
		credentials?: RawRow[];
		workflows?: RawRow[];
		variables?: Array<{ name: string; reason?: string }>;
	};
};

async function branchManifest(remoteUrl: string): Promise<RawManifest> {
	return jsonParse<RawManifest>(await branchFile(remoteUrl, 'n8n/manifest.json'));
}

/** The commit, the uncommitted changes and the entries of the checkout of an environment. */
async function checkoutState(environmentId: string) {
	const { repositoryFolder } = Container.get(PromotionWorkingDirectoryService).paths(environmentId);
	const git = createFixtureGit(repositoryFolder);
	return {
		head: await git.revparse(['HEAD']),
		uncommitted: await git.raw(['status', '--porcelain', '--untracked-files=all']),
		entries: (await readdir(repositoryFolder)).sort(),
	};
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

const idsOf = (entries: Array<{ id?: string }> | undefined) => entries?.map(({ id }) => id).sort();

/** Nothing in the given values may show this project. */
function expectNoTraceOf(project: Project, ...shown: unknown[]) {
	const text = JSON.stringify(shown);
	expect(text).not.toContain(project.id);
	expect(text).not.toContain(project.name);
}

async function promoteSelection(user: User, projectId: string, request: PromoteRequest) {
	return await Container.get(PromotionsService).promoteProjectSelection(projectId, user, request);
}

describe('Missing dependencies of a project Promote', () => {
	const promotePath = (projectId: string) => `/promotions/projects/${projectId}/promote`;

	it('lists what the project uses from another project, and a confirmed Promote writes the same branch with or without a preview', async () => {
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
		const selection = {
			workflowIds: [caller.id, local.id, ownSubWorkflow.id],
			confirmMissingDependencies: true,
		};
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
			project: { id: beta.id, name: beta.name },
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
			project: { id: beta.id, name: beta.name },
			blocking: false,
			consumers: consumersOf(caller),
		});
		expect(preview.warnings).toEqual([]);
		// The changes list the credential of Alpha. The Promote does not write the one of Beta.
		expect(preview.resources.filter(({ type }) => type === 'credential')).toEqual([
			expect.objectContaining({ id: ownCredential.id, change: 'added' }),
		]);
		expect((await previewOf(owner, alpha.id)).revision).toBe(preview.revision);

		const afterPreview = await promoteSelection(owner, alpha.id, {
			...selection,
			expectedPreviewRevision: preview.revision,
		});
		expectPushed(afterPreview);
		expect(afterPreview.missingDependencies).toEqual(preview.missingDependencies);
		const reviewedTree = await branchTree(reviewed.remoteUrl);

		await disconnectEnvironments();
		const direct = await connectNewRemote('direct');
		const withoutPreview = await promoteSelection(owner, alpha.id, selection);
		expectPushed(withoutPreview);

		expect(reviewedTree).not.toBe('');
		expect(await branchTree(direct.remoteUrl)).toBe(reviewedTree);
		expect(withoutPreview.counts).toEqual(afterPreview.counts);
		const manifest = await branchManifest(direct.remoteUrl);
		// The credential of Alpha itself is written under Alpha. The one of Beta has no file.
		expect(manifest.credentials).toHaveLength(1);
		expect(byId(manifest.credentials, ownCredential.id)?.target).toMatch(
			/^projects\/.+\/credentials\//,
		);
		expect(reviewedTree).not.toContain(credential.id);
		// Only the rows of the confirmed entries say why the package does not hold them.
		expect(manifest.requirements?.credentials).toHaveLength(2);
		expect(byId(manifest.requirements?.credentials, credential.id)?.reason).toBe(
			'confirmed-missing',
		);
		const ownCredentialRow = byId(manifest.requirements?.credentials, ownCredential.id);
		expect(ownCredentialRow).toMatchObject({ id: ownCredential.id });
		expect(ownCredentialRow).not.toHaveProperty('reason');
		expect(manifest.requirements?.workflows).toHaveLength(2);
		expect(byId(manifest.requirements?.workflows, subWorkflow.id)?.reason).toBe(
			'confirmed-missing',
		);
		const ownSubWorkflowRow = byId(manifest.requirements?.workflows, ownSubWorkflow.id);
		expect(ownSubWorkflowRow).toMatchObject({ id: ownSubWorkflow.id });
		expect(ownSubWorkflowRow).not.toHaveProperty('reason');
		expectNoTraceOf(beta, manifest, await headCommitMessage(direct.remoteUrl));
	}, 60_000);

	it('writes nothing without the confirmation, then writes the branch without the credential of the other project', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const local = await createWorkflow({ name: 'Local', nodes: [], connections: {} }, alpha);
		const { remoteUrl, environment } = await connectNewRemote('branch');
		const agent = server.publicApiAgentFor(owner);
		// Nothing of this selection is missing, so it needs no confirmation.
		const first = await agent.post(promotePath(alpha.id)).send({ workflowIds: [local.id] });
		expect(first.body).toMatchObject({ status: 'promoted', missingDependencies: [] });
		expect((await branchManifest(remoteUrl)).requirements).toBeUndefined();
		const head = await branchHead(remoteUrl);
		const checkout = await checkoutState(environment.id);
		expect(checkout.uncommitted).toBe('');

		const refused = await agent
			.post(promotePath(alpha.id))
			.send({ workflowIds: [caller.id] })
			.expect(200);

		expect(refused.body).toEqual({
			status: 'missing-dependencies',
			environmentId: environment.id,
			missingDependencies: [
				expect.objectContaining({ kind: 'credential', id: credential.id, name: 'CRM key' }),
				expect.objectContaining({ kind: 'workflow', id: subWorkflow.id, name: 'Notify' }),
			],
			warnings: [],
		});
		// The owner can read Beta, so each entry of the result names it.
		for (const entry of refused.body.missingDependencies) {
			expect(entry).toMatchObject({ project: { id: beta.id, name: beta.name } });
		}
		expect(await branchHead(remoteUrl)).toBe(head);
		expect(await checkoutState(environment.id)).toEqual(checkout);

		const confirmed = await agent
			.post(promotePath(alpha.id))
			.send({
				workflowIds: [caller.id],
				commitMessage: 'Promote the sync',
				confirmMissingDependencies: true,
			})
			.expect(200);

		expect(confirmed.body).toMatchObject({
			status: 'promoted',
			missingDependencies: refused.body.missingDependencies,
		});
		expect(await branchHead(remoteUrl)).not.toBe(head);
		const manifest = await branchManifest(remoteUrl);
		// No file for the credential of Beta: not at the top level, and not under Beta.
		expect(manifest.credentials).toBeUndefined();
		expect(await branchTree(remoteUrl)).not.toContain('credential.json');
		expect(idsOf(manifest.workflows)).toEqual([caller.id, local.id].sort());
		expect(byId(manifest.requirements?.credentials, credential.id)?.reason).toBe(
			'confirmed-missing',
		);
		expect(byId(manifest.requirements?.workflows, subWorkflow.id)?.reason).toBe(
			'confirmed-missing',
		);
		const message = await headCommitMessage(remoteUrl);
		expect(message.trim()).toBe(
			[
				'Promote the sync',
				'',
				'Missing dependencies:',
				`- credential: CRM key (${credential.id})`,
				`- workflow: Notify (${subWorkflow.id})`,
			].join('\n'),
		);
		// The branch does not name Beta, although the result names it for the owner.
		expectNoTraceOf(beta, manifest, message);
	}, 60_000);

	it('lists only the missing dependencies of the selection', async () => {
		await seedCrossProjectUse();
		const local = await createWorkflow({ name: 'Local', nodes: [], connections: {} }, alpha);
		const { remoteUrl } = await connectNewRemote('branch');
		// The preview covers the whole project, so it lists what `Sync` uses.
		expect((await previewOf(owner, alpha.id)).missingDependencies).toHaveLength(2);

		const result = await promoteSelection(owner, alpha.id, { workflowIds: [local.id] });

		expectPushed(result);
		expect(result.missingDependencies).toEqual([]);
		expect(idsOf((await branchManifest(remoteUrl)).workflows)).toEqual([local.id]);
	}, 60_000);

	it('confirms exactly the reviewed lists with the revision, and the lists of the Promote without it', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const { remoteUrl } = await connectNewRemote('branch');
		const reviewed = await previewOf(owner, alpha.id);
		expect(idsOf(reviewed.missingDependencies)).toEqual([credential.id, subWorkflow.id].sort());

		// The workflow starts to use one more credential of Beta after the review.
		const added = await saveHeaderCredential('Billing key', beta);
		await shareCredentialWithProjects(added, [alpha]);
		await Container.get(WorkflowRepository).update(caller.id, {
			nodes: [
				headerAuthNode(credential),
				headerAuthNode(added),
				executeWorkflowNode(subWorkflow.id),
			],
		});

		const stale = await promoteSelection(owner, alpha.id, {
			workflowIds: [caller.id],
			confirmMissingDependencies: true,
			expectedPreviewRevision: reviewed.revision,
		});

		expect(stale).toEqual({ status: 'preview-changed', environmentId: expect.any(String) });
		expect(await branchTree(remoteUrl)).toBe('');
		const current = await previewOf(owner, alpha.id);
		expect(idsOf(current.missingDependencies)).toEqual(
			[credential.id, added.id, subWorkflow.id].sort(),
		);

		const atRunTime = await promoteSelection(owner, alpha.id, {
			workflowIds: [caller.id],
			confirmMissingDependencies: true,
		});

		expectPushed(atRunTime);
		expect(atRunTime.missingDependencies).toEqual(current.missingDependencies);
	}, 60_000);

	it('stops listing a dependency when the branch holds it under its project, and a later Promote removes its reason', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const { remoteUrl } = await connectNewRemote('branch');
		expectPushed(
			await promoteSelection(owner, alpha.id, {
				workflowIds: [caller.id],
				confirmMissingDependencies: true,
			}),
		);

		// The Promote of Alpha wrote no file for the credential of Beta.
		expect((await branchManifest(remoteUrl)).credentials).toBeUndefined();
		const before = await previewOf(owner, alpha.id);
		expect(idsOf(before.missingDependencies)).toEqual([credential.id, subWorkflow.id].sort());

		// Beta holds nothing of another project, so its Promote needs no confirmation.
		const fromBeta = await promoteSelection(owner, beta.id, {
			workflowIds: [subWorkflow.id],
			credentialIds: [credential.id],
		});
		expectPushed(fromBeta);
		expect(fromBeta.missingDependencies).toEqual([]);
		expect(byId((await branchManifest(remoteUrl)).credentials, credential.id)?.target).toMatch(
			/^projects\/.+\/credentials\//,
		);

		const after = await previewOf(owner, alpha.id);
		expect(after.missingDependencies).toEqual([]);
		expect(after.warnings).toEqual([]);
		expect(after.revision).not.toBe(before.revision);
		// A Promote that reviewed the old lists stops, also with a confirmation.
		expect(
			await promoteSelection(owner, alpha.id, {
				workflowIds: [caller.id],
				confirmMissingDependencies: true,
				expectedPreviewRevision: before.revision,
			}),
		).toMatchObject({ status: 'preview-changed' });

		// The next Promote of the workflow writes its rows again, without a reason.
		const again = await promoteSelection(owner, alpha.id, { workflowIds: [caller.id] });
		expectPushed(again);
		expect(again.missingDependencies).toEqual([]);
		const { requirements } = await branchManifest(remoteUrl);
		expect(byId(requirements?.credentials, credential.id)).toBeDefined();
		expect(byId(requirements?.workflows, subWorkflow.id)).toBeDefined();
		for (const row of [...(requirements?.credentials ?? []), ...(requirements?.workflows ?? [])]) {
			expect(row).not.toHaveProperty('reason');
		}
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

	it('shows a user without access to the other project only what the workflow shows, also in what the Promote writes', async () => {
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
		const { remoteUrl } = await connectNewRemote('branch');

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
		expectNoTraceOf(beta, preview.missingDependencies, preview.warnings);
		const shown = JSON.stringify([preview.missingDependencies, preview.warnings]);
		expect(shown).not.toContain('Beta billing key');
		expect(shown).not.toContain('Notify');

		const ownerPreview = await previewOf(owner, alpha.id);
		expect(ownerPreview.missingDependencies).toHaveLength(3);
		// The owner can read Beta, so each entry names it.
		for (const entry of ownerPreview.missingDependencies ?? []) {
			expect(entry).toMatchObject({
				group: 'other-project',
				accessible: true,
				project: { id: beta.id, name: beta.name },
			});
		}

		const selection = { workflowIds: [caller.id, legacy.id] };
		const refused = await promoteSelection(promoter, alpha.id, selection);
		expect(refused).toMatchObject({
			status: 'missing-dependencies',
			missingDependencies: preview.missingDependencies,
		});
		expect(await branchTree(remoteUrl)).toBe('');
		const confirmed = await promoteSelection(promoter, alpha.id, {
			...selection,
			confirmMissingDependencies: true,
			expectedPreviewRevision: preview.revision,
		});
		expectPushed(confirmed);

		const manifest = await branchManifest(remoteUrl);
		expect(manifest.credentials).toBeUndefined();
		expect(idsOf(manifest.requirements?.credentials?.filter((row) => row.reason))).toEqual(
			[credential.id, hidden.id].sort(),
		);
		const written = [refused, confirmed, manifest, await headCommitMessage(remoteUrl)];
		expectNoTraceOf(beta, ...written);
		expect(JSON.stringify(written)).not.toContain('Beta billing key');
		expect(JSON.stringify(written)).not.toContain('Notify');
	}, 60_000);

	it('warns about references to something that this instance does not hold, and promotes them without a confirmation', async () => {
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
		const { remoteUrl } = await connectNewRemote('branch');

		const preview = await previewOf(owner, alpha.id);

		expect(preview.missingDependencies).toEqual([]);
		expect(preview.warnings).toEqual([
			{
				kind: 'credential',
				code: 'missing-on-source',
				id: deletedCredential.id,
				name: 'Deleted key',
				consumers: consumersOf(broken),
			},
			{
				kind: 'variable',
				code: 'missing-on-source',
				name: 'missing_region',
				consumers: consumersOf(usesVariables),
			},
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: deletedSubWorkflow.id,
				name: deletedSubWorkflow.id,
				consumers: consumersOf(broken),
			},
		]);

		const result = await promoteSelection(owner, alpha.id, {
			workflowIds: [broken.id, usesVariables.id],
			expectedPreviewRevision: preview.revision,
		});

		expectPushed(result);
		expect(result.missingDependencies).toEqual([]);
		const { requirements } = await branchManifest(remoteUrl);
		expect(byId(requirements?.credentials, deletedCredential.id)?.reason).toBe('missing-on-source');
		expect(byId(requirements?.workflows, deletedSubWorkflow.id)?.reason).toBe('missing-on-source');
		expect(requirements?.variables?.map(({ name }) => name).sort()).toEqual([
			'defined_region',
			'missing_region',
		]);
		for (const row of requirements?.variables ?? []) expect(row).not.toHaveProperty('reason');
		expect(await headCommitMessage(remoteUrl)).not.toContain('Missing dependencies');
	}, 60_000);
});

describe('Missing dependencies of an instance Promote', () => {
	const checkPath = (environmentId: string) =>
		`/promotions/environments/${environmentId}/promote/check`;
	const promotePath = (environmentId: string) =>
		`/promotions/environments/${environmentId}/promote`;

	it('refuses a sub-workflow of a personal project without the confirmation, then promotes the reference as authored', async () => {
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
		const agent = server.publicApiAgentFor(owner);

		const check = await agent.get(checkPath(environment.id)).expect(200);

		const missingDependencies = [
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
				blocking: false,
				consumers: consumersOf(caller),
			},
		];
		expect(check.body).toEqual({ missingDependencies, warnings: [], revision: expect.any(String) });
		const personalProject = await getPersonalProject(owner);
		expectNoTraceOf(personalProject, check.body);

		const refused = await agent.post(promotePath(environment.id)).send({}).expect(200);

		expect(refused.body).toEqual({
			status: 'missing-dependencies',
			environmentId: environment.id,
			missingDependencies,
			warnings: [],
		});
		expect(await branchTree(remoteUrl)).toBe('');

		const confirmed = await agent
			.post(promotePath(environment.id))
			.send({ confirmMissingDependencies: true, expectedPreviewRevision: check.body.revision })
			.expect(200);

		expect(confirmed.body).toMatchObject({ status: 'promoted', missingDependencies });
		const manifest = await branchManifest(remoteUrl);
		const target = byId(manifest.workflows, caller.id)?.target;
		const written = jsonParse<{ nodes: INode[] }>(
			await branchFile(remoteUrl, `n8n/${target}/workflow.json`),
		);
		// The branch holds the workflow with both references as the author wrote them. The export
		// keeps only the id of a credential reference.
		expect(
			written.nodes.map(({ parameters, credentials }) => ({ parameters, credentials })),
		).toEqual([
			{
				parameters: headerAuthNode(personalCredential).parameters,
				credentials: { httpHeaderAuth: { id: personalCredential.id } },
			},
			{ parameters: executeWorkflowNode(personalSubWorkflow.id).parameters },
		]);
		expect(idsOf(manifest.workflows)).toEqual([caller.id]);
		expect(manifest.credentials).toBeUndefined();
		expect(manifest.requirements?.credentials).toEqual([
			expect.objectContaining({ id: personalCredential.id, reason: 'confirmed-missing' }),
		]);
		expect(manifest.requirements?.workflows).toEqual([
			expect.objectContaining({ id: personalSubWorkflow.id, reason: 'confirmed-missing' }),
		]);
		const message = await headCommitMessage(remoteUrl);
		expect(message).toContain(
			[
				'Missing dependencies:',
				`- credential: My key (${personalCredential.id})`,
				`- workflow: My helper (${personalSubWorkflow.id})`,
			].join('\n'),
		);
		expectNoTraceOf(personalProject, refused.body, confirmed.body, manifest, message);
	}, 60_000);

	it('does not list what another team project holds, because the same Promote writes it', async () => {
		const { credential, subWorkflow, caller } = await seedCrossProjectUse();
		const { remoteUrl, environment } = await connectNewRemote('branch');
		const agent = server.publicApiAgentFor(owner);

		const check = await agent.get(checkPath(environment.id)).expect(200);

		expect(check.body).toEqual({
			missingDependencies: [],
			warnings: [],
			revision: expect.any(String),
		});
		expect((await agent.get(checkPath(environment.id)).expect(200)).body).toEqual(check.body);

		// Nothing is missing, so the Promote needs no confirmation and writes no reason.
		const promoted = await agent.post(promotePath(environment.id)).send({}).expect(200);
		expect(promoted.body).toMatchObject({ status: 'promoted', missingDependencies: [] });
		const manifest = await branchManifest(remoteUrl);
		expect(byId(manifest.credentials, credential.id)?.target).toMatch(
			/^projects\/.+\/credentials\//,
		);
		expect(JSON.stringify(manifest)).not.toContain('"reason"');
		expect(await headCommitMessage(remoteUrl)).not.toContain('Missing dependencies');

		// The revision follows the lists, and a Promote that reviewed the old lists stops.
		await Container.get(WorkflowRepository).delete(subWorkflow.id);
		const afterDelete = await agent.get(checkPath(environment.id)).expect(200);
		expect(afterDelete.body.warnings).toEqual([
			{
				kind: 'workflow',
				code: 'missing-on-source',
				id: subWorkflow.id,
				name: subWorkflow.id,
				consumers: consumersOf(caller),
			},
		]);
		expect(afterDelete.body.revision).not.toBe(check.body.revision);
		const head = await branchHead(remoteUrl);
		const stale = await agent
			.post(promotePath(environment.id))
			.send({ expectedPreviewRevision: check.body.revision })
			.expect(200);
		expect(stale.body).toEqual({ status: 'preview-changed', environmentId: environment.id });
		expect(await branchHead(remoteUrl)).toBe(head);

		// A warning needs no confirmation. Its row says that the source does not hold the workflow.
		const withWarning = await agent
			.post(promotePath(environment.id))
			.send({ expectedPreviewRevision: afterDelete.body.revision })
			.expect(200);
		expect(withWarning.body).toMatchObject({ status: 'promoted', missingDependencies: [] });
		expect((await branchManifest(remoteUrl)).requirements?.workflows).toEqual([
			expect.objectContaining({ id: subWorkflow.id, reason: 'missing-on-source' }),
		]);
	}, 60_000);

	it('refuses an API key without the promotions:promote scope', async () => {
		const { environment } = await connectNewRemote('branch');
		const reader = await createOwnerWithApiKey({ scopes: ['promotions:readEnvironments'] });

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
