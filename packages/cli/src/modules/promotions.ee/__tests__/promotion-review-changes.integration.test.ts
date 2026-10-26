import type { PromotionResource } from '@n8n/api-types';
import { createTeamProject, createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, type InstanceSettings } from 'n8n-core';
import assert from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { buildWorkflowReferencingCredential } from '@/modules/n8n-packages/__tests__/utils/test-builders';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { saveCredential } from '@test-integration/db/credentials';
import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '../database/repositories/promotion-run.repository';
import { GitLabMergeRequestClient } from '../git-hosts/gitlab-merge-request.client';
import type { GitLabMergeRequest } from '../git-hosts/gitlab-merge-request.types';
import { PromotionReviewHostResolver } from '../promotion-review-host.resolver';
import { PromotionWorkingDirectoryService } from '../promotion-working-directory.service';
import { PromotionsService } from '../promotions.service';

const instanceFolder = mkdtempSync(path.join(tmpdir(), 'promotion-review-changes-'));
Container.set(
	PromotionWorkingDirectoryService,
	new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder: instanceFolder })),
);
mockInstance(ActiveWorkflowManager);
// The remote is a local bare repository. Only the GitLab API is replaced.
const access = { baseUrl: 'https://gitlab.example.com', accessToken: 'token' };
const hostResolver = mockInstance(PromotionReviewHostResolver);
const mergeRequests = mockInstance(GitLabMergeRequestClient);
const server = setupTestServer({
	endpointGroups: ['promotions'],
	modules: ['promotions', 'n8n-packages'],
	enabledFeatures: ['feat:gitConnections'],
});

const author = ['-c', 'user.name=Reviewer', '-c', 'user.email=reviewer@example.com'];
let remoteFolder: string;
let owner: User;
let environmentId: string;
/** What GitLab reports for each merge request, by iid. */
let hostMergeRequests: Map<number, GitLabMergeRequest>;

beforeAll(() => {
	process.env.N8N_ENV_FEAT_PROMOTIONS = 'true';
	Container.get(SourceControlPreferencesService).sourceControlPreferences = {
		environmentsVersion: 'v2',
	};
});

afterAll(async () => {
	delete process.env.N8N_ENV_FEAT_PROMOTIONS;
	await rm(instanceFolder, { recursive: true, force: true });
});

beforeEach(async () => {
	await Container.get(PromotionRunRepository).delete({});
	await Container.get(PromotionReviewRepository).delete({});
	await Container.get(PromotionEnvironmentRepository).delete({});
	await Container.get(PromotionProviderRepository).delete({});
	await testDb.truncate([
		'SharedCredentials',
		'CredentialsEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);
	owner = await createOwner();

	remoteFolder = await mkdtemp(path.join(tmpdir(), 'promotion-review-changes-remote-'));
	await simpleGit().raw(['init', '--bare', '--initial-branch=main', remoteFolder]);
	await commitOnMain(async () => {});

	hostMergeRequests = new Map();
	hostResolver.resolve.mockResolvedValue({ access, projectPath: 'platform/workflows' });
	hostResolver.resolveForEnvironment.mockResolvedValue(access);
	mergeRequests.createMergeRequest.mockImplementation(async (_access, input) => {
		const iid = hostMergeRequests.size + 1;
		const mergeRequest: GitLabMergeRequest = {
			iid,
			project_id: 7,
			web_url: `${access.baseUrl}/platform/workflows/-/merge_requests/${iid}`,
			title: input.title,
			description: input.description,
			state: 'opened',
			source_branch: input.sourceBranch,
			target_branch: input.targetBranch,
			has_conflicts: false,
		};
		hostMergeRequests.set(iid, mergeRequest);
		return mergeRequest;
	});
	mergeRequests.getMergeRequest.mockImplementation(async (_access, { iid }) => {
		const mergeRequest = hostMergeRequests.get(iid);
		if (!mergeRequest) throw new Error(`Unknown merge request ${iid}`);
		return mergeRequest;
	});

	const provider = await Container.get(PromotionProviderRepository).insertProvider({
		name: 'Reviews',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: await Container.get(Cipher).encryptV2(
			JSON.stringify({ schemaVersion: 1, username: 'test', password: 'test' }),
		),
	});
	const environment = await Container.get(PromotionEnvironmentRepository).insertEnvironment({
		name: 'Reviews',
		scope: 'instance',
		providerId: provider.id,
		remote: { schemaVersion: 1, remoteUrl: remoteFolder },
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
	});
	environmentId = environment.id;
	await Container.get(PromotionsService).clone(environmentId);
});

afterEach(async () => {
	await rm(remoteFolder, { recursive: true, force: true });
});

/** Promotes to a new branch, opens its merge request, and publishes the GitLab head ref. */
async function promote(commitMessage: string) {
	const result = await Container.get(PromotionsService).promote(environmentId, owner, {
		commitMessage,
		canExportVariableValues: true,
	});
	if (!result.review) throw new Error('The promotion opened no review');
	const { reviewId, number: iid } = result.review;
	await moveReviewHead(iid, result.git.commitSha);
	return { reviewId, iid, branchName: result.git.branchName, commitSha: result.git.commitSha };
}

async function moveReviewHead(iid: number, sha: string) {
	await simpleGit(remoteFolder).raw(['update-ref', `refs/merge-requests/${iid}/head`, sha]);
	const mergeRequest = hostMergeRequests.get(iid);
	if (mergeRequest) hostMergeRequests.set(iid, { ...mergeRequest, sha });
}

/** Merges like GitLab with a fast-forward merge, and returns the base that GitLab records. */
async function mergeOnHost(iid: number, headSha: string) {
	const remote = simpleGit(remoteFolder);
	const baseSha = (await remote.revparse(['main'])).trim();
	await remote.raw(['update-ref', 'refs/heads/main', headSha]);
	const mergeRequest = hostMergeRequests.get(iid);
	if (!mergeRequest) throw new Error(`Unknown merge request ${iid}`);
	hostMergeRequests.set(iid, {
		...mergeRequest,
		state: 'merged',
		diff_refs: { base_sha: baseSha, head_sha: headSha },
	});
}

/** Commits on `main` of the remote from a temporary clone, as a push on the host does. */
async function commitOnMain(change: (folder: string) => Promise<void>) {
	const folder = await mkdtemp(path.join(tmpdir(), 'promotion-review-changes-clone-'));
	try {
		const git = simpleGit(folder);
		await git.raw(['init', '--initial-branch=main']);
		await git.addRemote('origin', remoteFolder);
		if ((await simpleGit(remoteFolder).raw(['branch', '--list', 'main'])).trim()) {
			await git.fetch('origin', 'main');
			await git.raw(['reset', '--hard', 'origin/main']);
		}
		await change(folder);
		await git.raw(['add', '--all']);
		await git.raw([...author, 'commit', '--allow-empty', '-m', 'Edit on the host']);
		await git.raw(['push', 'origin', 'HEAD:refs/heads/main']);
	} finally {
		await rm(folder, { recursive: true, force: true });
	}
}

/** Rebases the review branch onto `main` of the remote, as the GitLab rebase button does. */
async function rebaseOnHost({ iid, branchName }: { iid: number; branchName: string }) {
	const folder = await mkdtemp(path.join(tmpdir(), 'promotion-review-changes-rebase-'));
	try {
		await simpleGit().clone(remoteFolder, folder, ['--branch', branchName]);
		const git = simpleGit(folder);
		await git.raw([...author, 'rebase', 'origin/main']);
		await git.raw(['push', '--force', 'origin', `HEAD:refs/heads/${branchName}`]);
		await moveReviewHead(iid, (await git.revparse(['HEAD'])).trim());
	} finally {
		await rm(folder, { recursive: true, force: true });
	}
}

const changesOf = async (reviewId: string) =>
	(await server.authAgentFor(owner).get(`/promotions/reviews/${reviewId}/changes`).expect(200)).body
		.data;

const changed = (resources: PromotionResource[]) =>
	resources.filter(({ change }) => change !== 'unchanged').map(({ key, change }) => [key, change]);

it('lists the workflows and dependencies that an open review changes in several projects', async () => {
	const sales = await createTeamProject('Sales', owner);
	const support = await createTeamProject('Support', owner);
	const quote = await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, sales);
	await createWorkflow({ name: 'Untouched', nodes: [], connections: {} }, support);
	const first = await promote('Baseline');
	await mergeOnHost(first.iid, first.commitSha);

	await Container.get(WorkflowRepository).update(quote.id, { name: 'Send quote' });
	const credential = await saveCredential(
		{ name: 'Helpdesk API', type: 'httpHeaderAuth', data: {} },
		{ project: support, role: 'credential:owner' },
	);
	const ticket = await buildWorkflowReferencingCredential({
		name: 'Open ticket',
		project: support,
		credential,
	});
	const second = await promote('Changes');

	const changes = await changesOf(second.reviewId);

	expect(changes).toMatchObject({ baselineCommitSha: first.commitSha, warnings: [] });
	expect(changes.headCommitSha).toBe(second.commitSha);
	expect(changed(changes.resources)).toEqual([
		[`workflow:${ticket.id}`, 'added'],
		[`workflow:${quote.id}`, 'modified'],
		[`credential:${credential.id}`, 'added'],
	]);
	expect(changes.resources).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ key: `project:${sales.id}`, change: 'unchanged' }),
			expect.objectContaining({ key: `project:${support.id}`, change: 'unchanged' }),
			expect.objectContaining({ key: `workflow:${quote.id}`, previousName: 'Quote' }),
		]),
	);
	expect(changes.dependencies).toEqual([
		{
			workflowKey: `workflow:${ticket.id}`,
			resourceKey: `credential:${credential.id}`,
			included: true,
		},
	]);

	const { body } = await server
		.authAgentFor(owner)
		.post(`/promotions/reviews/${second.reviewId}/changes/details`)
		.send({
			baselineCommitSha: changes.baselineCommitSha,
			headCommitSha: changes.headCommitSha,
			keys: [`workflow:${quote.id}`, 'workflow:unknown'],
		})
		.expect(200);
	expect(body.data.missingKeys).toEqual(['workflow:unknown']);
	expect(body.data.details).toEqual([
		expect.objectContaining({
			key: `workflow:${quote.id}`,
			before: expect.objectContaining({ name: 'Quote' }),
			after: expect.objectContaining({ name: 'Send quote' }),
		}),
	]);
}, 60_000);

it('shows only the changes of the review after a rebase on the host', async () => {
	const project = await createTeamProject('Sales', owner);
	const quote = await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, project);
	const invoice = await createWorkflow({ name: 'Invoice', nodes: [], connections: {} }, project);
	const first = await promote('Baseline');
	await mergeOnHost(first.iid, first.commitSha);
	await Container.get(WorkflowRepository).update(quote.id, { name: 'Send quote' });
	const review = await promote('Changes');

	// Somebody changes another workflow on the target branch, then rebases the review on it.
	await commitOnMain(async (folder) => {
		const [file] = (await simpleGit(folder).raw(['ls-files', `*-${invoice.id}/workflow.json`]))
			.split('\n')
			.filter(Boolean);
		const workflow = JSON.parse(await readFile(path.join(folder, file), 'utf8'));
		await writeFile(
			path.join(folder, file),
			JSON.stringify({ ...workflow, settings: { executionOrder: 'v1' } }),
		);
	});
	await rebaseOnHost(review);
	const mainTip = (await simpleGit(remoteFolder).revparse(['main'])).trim();

	const changes = await changesOf(review.reviewId);

	expect(changes.baselineCommitSha).toBe(mainTip);
	expect(changes.headCommitSha).not.toBe(review.commitSha);
	expect(changed(changes.resources)).toEqual([[`workflow:${quote.id}`, 'modified']]);
}, 60_000);

it('diffs a merged review against the base that the host recorded', async () => {
	const project = await createTeamProject('Sales', owner);
	const quote = await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, project);
	const review = await promote('Baseline');
	const baseSha = (await simpleGit(remoteFolder).revparse(['main'])).trim();
	await mergeOnHost(review.iid, review.commitSha);

	const changes = await changesOf(review.reviewId);

	expect(changes).toMatchObject({ baselineCommitSha: baseSha, headCommitSha: review.commitSha });
	expect(changed(changes.resources)).toEqual([
		[`project:${project.id}`, 'added'],
		[`workflow:${quote.id}`, 'added'],
	]);
}, 60_000);

it('lists what a full promotion removes: a credential that no workflow uses and a project', async () => {
	const support = await createTeamProject('Support', owner);
	const archive = await createTeamProject('Archive', owner);
	const credential = await saveCredential(
		{ name: 'Helpdesk API', type: 'httpHeaderAuth', data: {} },
		{ project: support, role: 'credential:owner' },
	);
	const ticket = await buildWorkflowReferencingCredential({
		name: 'Open ticket',
		project: support,
		credential,
	});
	const first = await promote('Baseline');
	await mergeOnHost(first.iid, first.commitSha);

	await Container.get(WorkflowRepository).update(ticket.id, { nodes: [] });
	await Container.get(ProjectRepository).delete({ id: archive.id });
	const review = await promote('Cleanup');

	const changes = await changesOf(review.reviewId);

	expect(changed(changes.resources)).toEqual([
		[`project:${archive.id}`, 'deleted'],
		[`workflow:${ticket.id}`, 'modified'],
		[`credential:${credential.id}`, 'deleted'],
	]);
}, 60_000);

it('lists a workflow that moves to another project without other changes', async () => {
	const sales = await createTeamProject('Sales', owner);
	const support = await createTeamProject('Support', owner);
	const quote = await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, sales);
	const first = await promote('Baseline');
	await mergeOnHost(first.iid, first.commitSha);

	await Container.get(SharedWorkflowRepository).update(
		{ workflowId: quote.id },
		{ projectId: support.id },
	);
	// Promote now refuses a move between projects, but a branch can still get one from an older
	// version or a hand edit, so the review must still show it. Skip the refusal to write one.
	const guard = vi
		.spyOn(
			Container.get(PromotionsService) as unknown as {
				assertNoProjectMovesSinceBranch: () => Promise<void>;
			},
			'assertNoProjectMovesSinceBranch',
		)
		.mockResolvedValue();
	const review = await promote('Move');
	guard.mockRestore();

	const changes = await changesOf(review.reviewId);

	expect(changed(changes.resources)).toEqual([[`workflow:${quote.id}`, 'modified']]);
	expect(changes.resources).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				key: `workflow:${quote.id}`,
				parentKey: `project:${support.id}`,
				previousParentKey: `project:${sales.id}`,
			}),
		]),
	);
}, 60_000);

it('reads a merged review from the target branch after the host deleted its head ref', async () => {
	const project = await createTeamProject('Sales', owner);
	const quote = await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, project);
	const review = await promote('Changes');
	// The rebase gives the review a head that only the host has.
	await commitOnMain(async () => {});
	await rebaseOnHost(review);
	const headSha = hostMergeRequests.get(review.iid)?.sha;
	if (!headSha) throw new Error('The rebase recorded no head');
	await mergeOnHost(review.iid, headSha);
	await simpleGit(remoteFolder).raw(['update-ref', '-d', `refs/merge-requests/${review.iid}/head`]);

	const changes = await changesOf(review.reviewId);

	expect(changes.headCommitSha).toBe(headSha);
	expect(changed(changes.resources)).toEqual([
		[`project:${project.id}`, 'added'],
		[`workflow:${quote.id}`, 'added'],
	]);
}, 60_000);

const writeUnreadableManifest = async (folder: string) => {
	await mkdir(path.join(folder, 'n8n'), { recursive: true });
	await writeFile(path.join(folder, 'n8n', 'manifest.json'), '{ not json');
};

it('refuses a promote when the manifest of the target branch cannot be read', async () => {
	const project = await createTeamProject('Sales', owner);
	await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, project);
	await commitOnMain(writeUnreadableManifest);
	const mainBefore = (await simpleGit(remoteFolder).revparse(['main'])).trim();

	await expect(promote('Changes')).rejects.toMatchObject({
		httpStatusCode: 400,
		message: expect.stringContaining('"n8n/manifest.json" on the branch is not readable'),
	});
	expect(hostMergeRequests.size).toBe(0);
	expect((await simpleGit(remoteFolder).raw(['branch', '--list'])).trim()).toBe('* main');
	expect((await simpleGit(remoteFolder).revparse(['main'])).trim()).toBe(mainBefore);
}, 60_000);

it('lists nothing when the recorded base of a closed review has an unreadable manifest', async () => {
	const project = await createTeamProject('Sales', owner);
	await createWorkflow({ name: 'Quote', nodes: [], connections: {} }, project);
	const review = await promote('Changes');
	// The manifest on `main` became unreadable after the promote, and the host recorded that
	// commit as the base of the review when it closed.
	await commitOnMain(writeUnreadableManifest);
	const baseSha = (await simpleGit(remoteFolder).revparse(['main'])).trim();
	const mergeRequest = hostMergeRequests.get(review.iid);
	assert(mergeRequest);
	hostMergeRequests.set(review.iid, {
		...mergeRequest,
		state: 'closed',
		diff_refs: { base_sha: baseSha, head_sha: review.commitSha },
	});

	const changes = await changesOf(review.reviewId);

	expect(changes).toMatchObject({
		resources: [],
		dependencies: [],
		warnings: ['baselineManifestUnreadable'],
	});
}, 60_000);
