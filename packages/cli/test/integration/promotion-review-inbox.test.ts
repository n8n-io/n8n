import { testDb } from '@n8n/backend-test-utils';
import { GLOBAL_ADMIN_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import nock from 'nock';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironmentRepository } from '@/modules/promotions.ee/database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '@/modules/promotions.ee/database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '@/modules/promotions.ee/database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '@/modules/promotions.ee/database/repositories/promotion-run.repository';
import { PromotionEnvironmentResolver } from '@/modules/promotions.ee/promotion-environment.resolver';
import { PromotionReviewsService } from '@/modules/promotions.ee/promotion-reviews.service';
import {
	createAdmin,
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createUser,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const baseUrl = 'https://gitlab.example.com';
const token = 'review-token';
const projectId = 7;
const headSha = 'a'.repeat(40);

type MergeRequestAnswer = {
	state: string;
	detailed_merge_status?: string;
	source_branch?: string;
	has_conflicts?: boolean;
};

/** A merge request, or the HTTP status GitLab answers with. Unknown iids answer 404. */
type GitLabAnswer = MergeRequestAnswer | number;

const mergeRequest = (iid: number, answer: MergeRequestAnswer) => ({
	iid,
	project_id: projectId,
	web_url: `${baseUrl}/platform/workflows/-/merge_requests/${iid}`,
	title: `Promotion ${iid}`,
	description: 'Opened by n8n',
	source_branch: `n8n-promotion/${iid}`,
	target_branch: 'main',
	sha: headSha,
	...answer,
});

/** Answers like GitLab and returns the iids it was asked for, in call order. */
function gitlab(answers: Record<number, GitLabAnswer>, { delayMs = 0 } = {}) {
	const calls: number[] = [];
	nock(baseUrl)
		.persist()
		.matchHeader('PRIVATE-TOKEN', token)
		.get(new RegExp(`^/api/v4/projects/${projectId}/merge_requests/\\d+$`))
		.delay(delayMs)
		.reply((uri) => {
			const iid = Number(uri.split('/').pop());
			calls.push(iid);
			const answer = answers[iid];
			if (answer === undefined) return [404, { message: '404 Not found' }];
			if (typeof answer === 'number') return [answer, {}];
			return [200, mergeRequest(iid, answer)];
		});
	return calls;
}

type GitLabWrites = {
	approve?: number[];
	/** `reset` drops the connection, so n8n never sees the answer. */
	merge?: Array<number | 'reset'>;
	mergeDelayMs?: number;
	beforeMerge?: () => Promise<void>;
};

/**
 * Answers the approve, merge, and note calls for one merge request with the next answer
 * in each list, and returns the calls with their bodies, in call order.
 */
function gitlabWrites(
	iid: number,
	{
		approve = [201],
		merge = [200],
		mergeDelayMs = 0,
		beforeMerge = async () => {},
	}: GitLabWrites = {},
) {
	const calls: Array<[string, unknown]> = [];
	const path = `/api/v4/projects/${projectId}/merge_requests/${iid}`;
	// The last answer repeats.
	const next = <T>(answers: T[]) => (answers.length > 1 ? answers.splice(0, 1) : answers)[0];
	const answer = (status: number, ok: object): [number, object] =>
		status < 300 ? [status, ok] : [status, { message: `${status} refused` }];
	nock(baseUrl)
		.persist()
		.matchHeader('PRIVATE-TOKEN', token)
		.post(`${path}/approve`)
		.reply((_uri, body) => {
			calls.push(['approve', body]);
			return answer(next(approve), {});
		})
		.put(`${path}/merge`)
		.delay(mergeDelayMs)
		.reply((_uri, body, respond) => {
			calls.push(['merge', body]);
			const status = next(merge);
			void beforeMerge()
				.then(() =>
					status === 'reset'
						? // nock drops the reply when it gets an error.
							respond(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }), [200])
						: respond(null, answer(status, mergeRequest(iid, { state: 'merged' }))),
				)
				.catch((error: unknown) => respond(error as Error, [500]));
		})
		.post(`${path}/notes`)
		.reply((_uri, body) => {
			calls.push(['note', body]);
			return [201, {}];
		});
	return calls;
}

describe('Promotion reviews in the Inbox', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:gitConnections'],
		modules: ['inbox', 'promotions'],
	});
	let owner: User;
	let environmentId: string;
	let reviewRepository: PromotionReviewRepository;

	async function insertReview(iid: number, over: { environmentId?: string } = {}) {
		const reviewEnvironmentId = over.environmentId ?? environmentId;
		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			environmentId: reviewEnvironmentId,
			type: 'gitlab',
			remoteReviewId: `${projectId}!${iid}`,
			createdById: owner.id,
		});
		await reviewRepository.update(
			{ id: review.id },
			{ createdAt: new Date(Date.UTC(2026, 9, iid)) },
		);
		await Container.get(PromotionRunRepository).insertRun({
			environmentId: reviewEnvironmentId,
			createdById: owner.id,
			direction: 'promote',
			type: 'git',
			details: { schemaVersion: 1, branchName: `n8n-promotion/${iid}`, commitSha: 'c'.repeat(40) },
			reviewId: review.id,
		});
		return review.id;
	}

	async function createEnvironment(
		provider: object,
		target: { name: string; scope: string; remoteUrl: string },
	) {
		const agent = testServer.publicApiAgentFor(owner);
		const created = await agent.post('/promotions/providers').send(provider);
		expect(created.status, JSON.stringify(created.body)).toBe(201);
		const environment = await agent.post('/promotions/environments').send({
			name: target.name,
			scope: target.scope,
			providerId: created.body.provider.id,
			remote: { schemaVersion: 1, remoteUrl: target.remoteUrl },
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
		});
		expect(environment.status, JSON.stringify(environment.body)).toBe(201);
		return environment.body.id as string;
	}

	/** A plain Git provider has no host API, so its reviews report no_connection. */
	const createGitEnvironment = async (name: string) =>
		await createEnvironment(
			{ name, type: 'git', auth: { authType: 'token', username: 'u', password: 'p' } },
			{ name, scope: 'projects', remoteUrl: `https://example.com/org/${name}.git` },
		);

	const inbox = async (user: User, query: Record<string, string>) =>
		await testServer.authAgentFor(user).get('/inbox').query(query);

	const approve = async (user: User, reviewId: string, headCommitSha = headSha) =>
		await testServer
			.authAgentFor(user)
			.post(`/promotions/reviews/${reviewId}/approve`)
			.send({ headCommitSha });

	const approvedById = async (reviewId: string) =>
		(await reviewRepository.findOneByOrFail({ id: reviewId })).approvedById;

	beforeAll(async () => {
		process.env.N8N_ENV_FEAT_PROMOTIONS = 'true';
		reviewRepository = Container.get(PromotionReviewRepository);
	});

	afterAll(() => {
		delete process.env.N8N_ENV_FEAT_PROMOTIONS;
	});

	beforeEach(async () => {
		testServer.license.reset();
		await Container.get(PromotionRunRepository).delete({});
		await reviewRepository.delete({});
		await Container.get(PromotionEnvironmentRepository).delete({});
		await Container.get(PromotionProviderRepository).delete({});
		await testDb.truncate(['User']);
		owner = await createOwnerWithApiKey();

		const validation = nock(baseUrl)
			.get('/api/v4/user')
			.reply(200, { id: 1 })
			.get('/api/v4/projects')
			.query(true)
			.reply(200, []);
		environmentId = await createEnvironment(
			{
				name: 'GitLab',
				type: 'gitlab',
				auth: { authType: 'token', password: token },
				config: { schemaVersion: 1, baseUrl },
			},
			{ name: 'To production', scope: 'instance', remoteUrl: `${baseUrl}/platform/workflows.git` },
		);
		validation.done();
	});

	afterEach(() => nock.cleanAll());

	it('lists the review opened by the promotion write path for its environment', async () => {
		const branchName = 'n8n-promotion/1';
		const commitSha = 'c'.repeat(40);
		const run = await Container.get(PromotionRunRepository).insertRun({
			environmentId,
			createdById: owner.id,
			direction: 'promote',
			type: 'git',
			details: { schemaVersion: 1, branchName, commitSha },
			reviewId: null,
		});
		const opened = nock(baseUrl)
			.matchHeader('PRIVATE-TOKEN', token)
			.post('/api/v4/projects/platform%2Fworkflows/merge_requests', {
				source_branch: branchName,
				target_branch: 'main',
				title: 'Promotion 1',
				description: /^Opened by n8n/,
				remove_source_branch: false,
			})
			.reply(201, {
				iid: 1,
				project_id: projectId,
				web_url: `${baseUrl}/platform/workflows/-/merge_requests/1`,
				title: 'Promotion 1',
				description: 'Opened by n8n',
				state: 'opened',
				source_branch: branchName,
				target_branch: 'main',
			});
		const input = await Container.get(PromotionEnvironmentResolver).resolveForEnvironment(
			environmentId,
			'promote',
		);
		const result = await Container.get(PromotionReviewsService).openMergeRequest(
			input,
			owner,
			{ branchName, baseBranchName: 'main', commitSha, title: 'Promotion 1' },
			run.id,
		);
		opened.done();
		expect(result.warnings).toEqual([]);
		expect(result.review).toMatchObject({ number: 1 });
		gitlab({ 1: { state: 'opened' } });

		const response = await inbox(owner, { state: 'open', category: 'waiting' });

		expect(response.status, JSON.stringify(response.body)).toBe(200);
		expect(response.body.data.data).toEqual([
			expect.objectContaining({
				id: result.review?.reviewId,
				title: 'Promotion 1',
				branchName,
				environmentName: 'To production',
				requester: expect.objectContaining({ id: owner.id }),
				remoteError: null,
			}),
		]);
	});

	it('syncs from any tab, keeps reviews GitLab did not answer for, and ignores a merge request from another branch', async () => {
		const opened = await insertReview(1);
		const changesRequested = await insertReview(2);
		const merged = await insertReview(3);
		const closed = await insertReview(4);
		const notFound = await insertReview(5);
		const rejected = await insertReview(6);
		const unreachable = await insertReview(7);
		const otherBranch = await insertReview(8);
		const plainGit = await insertReview(9, { environmentId: await createGitEnvironment('Plain') });
		const deletedEnvironmentId = await createGitEnvironment('Deleted');
		const deleted = await insertReview(10, { environmentId: deletedEnvironmentId });
		await Container.get(PromotionEnvironmentRepository).delete({ id: deletedEnvironmentId });
		gitlab({
			1: { state: 'opened' },
			2: { state: 'opened', detailed_merge_status: 'requested_changes' },
			3: { state: 'merged' },
			4: { state: 'closed' },
			6: 401,
			7: 503,
			8: { state: 'merged', source_branch: 'n8n-promotion/elsewhere' },
		});

		const closedList = await inbox(owner, { state: 'closed' });
		const open = await inbox(owner, { state: 'open', category: 'waiting' });

		expect(closedList.status, JSON.stringify(closedList.body)).toBe(200);
		expect(closedList.body.data.data).toHaveLength(2);
		expect(closedList.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: merged, state: 'closed', reviewState: 'merged' }),
				expect.objectContaining({ id: closed, state: 'closed', reviewState: 'closed' }),
			]),
		);
		expect(open.body.data.data).toHaveLength(8);
		expect(open.body.data.data).toEqual(
			expect.arrayContaining([
				{
					type: 'promotion_review',
					id: opened,
					state: 'open',
					reviewState: 'open',
					title: 'Promotion 1',
					webUrl: `${baseUrl}/platform/workflows/-/merge_requests/1`,
					branchName: 'n8n-promotion/1',
					environmentName: 'To production',
					requester: expect.objectContaining({ id: owner.id }),
					approver: null,
					remoteError: null,
					headCommitSha: headSha,
					runCommitSha: 'c'.repeat(40),
					hasConflicts: false,
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
				expect.objectContaining({ id: changesRequested, reviewState: 'changes_requested' }),
				expect.objectContaining({
					id: notFound,
					title: null,
					webUrl: null,
					branchName: 'n8n-promotion/5',
					remoteError: 'not_found',
				}),
				expect.objectContaining({ id: rejected, remoteError: 'auth' }),
				expect.objectContaining({ id: unreachable, remoteError: 'unreachable' }),
				expect.objectContaining({
					id: otherBranch,
					reviewState: 'open',
					title: null,
					remoteError: 'not_found',
				}),
				expect.objectContaining({ id: plainGit, remoteError: 'no_connection' }),
				expect.objectContaining({ id: deleted, remoteError: 'no_connection' }),
			]),
		);
		expect(JSON.stringify([open.body, closedList.body])).not.toContain(token);
	});

	it('answers the first page and the counters from one shared sync', async () => {
		await insertReview(1);
		const stillOpen = await insertReview(2);
		const calls = gitlab({ 1: { state: 'merged' }, 2: { state: 'opened' } }, { delayMs: 300 });

		const [open, summary] = await Promise.all([
			inbox(owner, { state: 'open', category: 'waiting' }),
			testServer.authAgentFor(owner).get('/inbox/summary'),
		]);

		expect(open.body.data.data.map(({ id }: { id: string }) => id)).toEqual([stillOpen]);
		expect(summary.body.data.counts).toEqual({ open: 1, closed: 1 });
		expect(calls.toSorted()).toEqual([1, 2]);
	});

	it('pages with the Inbox cursor and reads only the next batch from GitLab', async () => {
		const oldest = await insertReview(1);
		const middle = await insertReview(2);
		const newest = await insertReview(3);
		const calls = gitlab({
			1: { state: 'opened' },
			2: { state: 'opened' },
			3: { state: 'opened' },
		});

		const first = await inbox(owner, { state: 'open', category: 'waiting', limit: '2' });
		const callsForFirstPage = calls.length;
		const second = await inbox(owner, {
			state: 'open',
			category: 'waiting',
			limit: '2',
			cursor: first.body.data.nextCursor,
		});

		expect(first.body.data.data.map(({ id }: { id: string }) => id)).toEqual([newest, middle]);
		expect(second.body.data.data.map(({ id }: { id: string }) => id)).toEqual([oldest]);
		expect(second.body.data.nextCursor).toBeNull();
		expect(callsForFirstPage).toBe(3);
		expect(calls.slice(callsForFirstPage)).toEqual([1]);
	});

	it('hides promotion reviews from a member and while the rollout flag is off', async () => {
		await insertReview(1);
		gitlab({ 1: { state: 'opened' } });
		const member = await createMemberWithApiKey();

		const asMember = await inbox(member, { state: 'open', category: 'waiting' });
		expect(asMember.body.data.data).toEqual([]);
		expect((await testServer.authAgentFor(member).get('/inbox/summary')).body.data.counts).toEqual({
			open: 0,
			closed: 0,
		});

		process.env.N8N_ENV_FEAT_PROMOTIONS = 'false';
		try {
			const flagOff = await inbox(owner, { state: 'open', category: 'waiting' });
			expect(flagOff.body.data.data).toEqual([]);
			expect(flagOff.body.data.disabledSources).toContain('promotion_review');
		} finally {
			process.env.N8N_ENV_FEAT_PROMOTIONS = 'true';
		}
	});

	describe('approve and merge', () => {
		it('approves and merges the head the admin saw, names the admin in a note, and closes the review', async () => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened' } });
			const writes = gitlabWrites(1);
			const admin = await createAdmin();

			const [row] = (await inbox(admin, { state: 'open', category: 'waiting' })).body.data.data;
			const response = await approve(admin, reviewId, row.headCommitSha);

			expect(response.status, JSON.stringify(response.body)).toBe(200);
			expect(writes).toEqual([
				['approve', { sha: headSha }],
				['merge', { sha: headSha, should_remove_source_branch: true }],
				['note', { body: `Approved and merged in n8n by ${admin.firstName} ${admin.lastName}.` }],
			]);
			const merged = expect.objectContaining({
				id: reviewId,
				state: 'closed',
				reviewState: 'merged',
				approver: expect.objectContaining({ id: admin.id }),
			});
			expect(response.body.data).toEqual(merged);
			expect((await inbox(admin, { state: 'closed' })).body.data.data).toEqual([merged]);
		});

		it('refuses a member and a disabled rollout flag without a GitLab write', async () => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened' } });
			const writes = gitlabWrites(1);

			expect((await approve(await createMember(), reviewId)).status).toBe(403);
			process.env.N8N_ENV_FEAT_PROMOTIONS = 'false';
			try {
				expect((await approve(await createAdmin(), reviewId)).status).toBe(403);
			} finally {
				process.env.N8N_ENV_FEAT_PROMOTIONS = 'true';
			}
			expect(writes).toEqual([]);
		});

		it.each([
			['changes are requested', { detailed_merge_status: 'requested_changes' }, headSha, 409],
			['the merge request has conflicts', { has_conflicts: true }, headSha, 409],
			['GitLab has a newer head', {}, 'b'.repeat(40), 409],
			['the merge request comes from another branch', { source_branch: 'other' }, headSha, 404],
		])('answers without a GitLab write when %s', async (_case, answer, sha, status) => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened', ...answer } });
			const writes = gitlabWrites(1);

			expect((await approve(await createAdmin(), reviewId, sha)).status).toBe(status);
			expect(writes).toEqual([]);
			expect(await approvedById(reviewId)).toBeNull();
		});

		it('lets one of two admins approve at the same time', async () => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened' } });
			const writes = gitlabWrites(1, { mergeDelayMs: 300 });
			const [first, second] = [await createAdmin(), await createAdmin()];

			const responses = await Promise.all([approve(first, reviewId), approve(second, reviewId)]);

			expect(responses.map(({ status }) => status).toSorted()).toEqual([200, 409]);
			expect(writes.filter(([call]) => call === 'merge')).toHaveLength(1);
		});

		it('releases the claim when GitLab refuses the merge, so the admin can retry', async () => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened' } });
			// The second approval fails because GitLab already counts the first one.
			const writes = gitlabWrites(1, { approve: [201, 401], merge: [405, 200] });
			const admin = await createUser({ role: GLOBAL_ADMIN_ROLE, firstName: '', lastName: '' });

			const refused = await approve(admin, reviewId);
			expect(refused.status).toBe(400);
			expect(refused.body.message).toContain("GitLab can't merge this merge request now.");
			expect(JSON.stringify(refused.body)).not.toContain(token);
			expect(await approvedById(reviewId)).toBeNull();

			expect((await approve(admin, reviewId)).status).toBe(200);
			expect(writes.map(([call]) => call)).toEqual([
				'approve',
				'merge',
				'approve',
				'merge',
				'note',
			]);
			expect(writes.at(-1)).toEqual(['note', { body: 'Approved and merged in n8n.' }]);
		});

		it('answers Merged when an Inbox sync records the merge first', async () => {
			const reviewId = await insertReview(1);
			gitlab({ 1: { state: 'opened' } });
			gitlabWrites(1, {
				beforeMerge: async () => {
					await reviewRepository.update({ id: reviewId }, { state: 'merged' });
				},
			});

			const response = await approve(await createAdmin(), reviewId);

			expect(response.body.data).toMatchObject({ state: 'closed', reviewState: 'merged' });
		});

		it('finishes the approval when GitLab merged but its answer was lost', async () => {
			const reviewId = await insertReview(1);
			const answers: Record<number, GitLabAnswer> = { 1: { state: 'opened' } };
			gitlab(answers);
			const writes = gitlabWrites(1, {
				merge: ['reset'],
				beforeMerge: async () => {
					answers[1] = { state: 'merged' };
				},
			});
			const admin = await createAdmin();

			const response = await approve(admin, reviewId);

			expect(response.status, JSON.stringify(response.body)).toBe(200);
			expect(response.body.data).toMatchObject({
				reviewState: 'merged',
				approver: expect.objectContaining({ id: admin.id }),
			});
			expect(writes.at(-1)?.[0]).toBe('note');
		});

		it('keeps the claim, and shows no approver, when GitLab does not confirm the merge', async () => {
			const reviewId = await insertReview(1);
			const answers: Record<number, GitLabAnswer> = { 1: { state: 'opened' } };
			gitlab(answers);
			gitlabWrites(1, {
				merge: ['reset'],
				beforeMerge: async () => {
					answers[1] = 503;
				},
			});
			const admin = await createAdmin();

			const response = await approve(admin, reviewId);

			expect(response.status).toBe(503);
			expect(response.body.message).toContain("GitLab didn't confirm the merge");
			expect(await approvedById(reviewId)).toBe(admin.id);
			answers[1] = { state: 'opened' };
			expect((await approve(await createAdmin(), reviewId)).status).toBe(409);
			const [row] = (await inbox(admin, { state: 'open', category: 'waiting' })).body.data.data;
			expect(row).toMatchObject({ id: reviewId, approver: null });
		});

		it('lets an admin take a claim older than two minutes', async () => {
			const stale = await insertReview(1);
			const live = await insertReview(2);
			const other = await createAdmin();
			const claimedAgo = async (reviewId: string, ms: number) =>
				await reviewRepository.update(
					{ id: reviewId },
					{ approvedById: other.id, approvedAt: new Date(Date.now() - ms) },
				);
			await claimedAgo(stale, 3 * 60_000);
			await claimedAgo(live, 30_000);
			gitlab({ 1: { state: 'opened' }, 2: { state: 'opened' } });
			gitlabWrites(1);
			gitlabWrites(2);
			const admin = await createAdmin();

			expect((await approve(admin, stale)).status).toBe(200);
			expect((await approve(admin, live)).status).toBe(409);
			expect(await approvedById(live)).toBe(other.id);
		});
	});
});
