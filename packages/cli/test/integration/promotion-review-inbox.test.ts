import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import nock from 'nock';
import { v7 as uuidv7 } from 'uuid';

import { PromotionEnvironmentRepository } from '@/modules/promotions.ee/database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '@/modules/promotions.ee/database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '@/modules/promotions.ee/database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '@/modules/promotions.ee/database/repositories/promotion-run.repository';
import { PromotionEnvironmentResolver } from '@/modules/promotions.ee/promotion-environment.resolver';
import { PromotionReviewsService } from '@/modules/promotions.ee/promotion-reviews.service';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const baseUrl = 'https://gitlab.example.com';
const token = 'review-token';
const projectId = 7;

/** A merge request, or the HTTP status GitLab answers with. Unknown iids answer 404. */
type GitLabAnswer =
	| { state: string; detailed_merge_status?: string; source_branch?: string }
	| number;

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
			return [
				200,
				{
					iid,
					project_id: projectId,
					web_url: `${baseUrl}/platform/workflows/-/merge_requests/${iid}`,
					title: `Promotion ${iid}`,
					description: 'Opened by n8n',
					source_branch: `n8n-promotion/${iid}`,
					target_branch: 'main',
					...answer,
				},
			];
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
});
