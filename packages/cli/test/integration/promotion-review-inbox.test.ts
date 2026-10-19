import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import nock from 'nock';
import { v7 as uuidv7 } from 'uuid';

import { PromotionConfigRepository } from '@/modules/promotions.ee/database/repositories/promotion-config.repository';
import { PromotionConnectionRepository } from '@/modules/promotions.ee/database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '@/modules/promotions.ee/database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '@/modules/promotions.ee/database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '@/modules/promotions.ee/database/repositories/promotion-run.repository';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const baseUrl = 'https://gitlab.example.com';
const token = 'review-token';
const projectId = 7;

/** A merge request state, or the HTTP status GitLab answers with. Unknown iids answer 404. */
type GitLabAnswer = { state: string; detailed_merge_status?: string } | number;

function gitlab(answers: Record<number, GitLabAnswer>) {
	return nock(baseUrl)
		.persist()
		.matchHeader('PRIVATE-TOKEN', token)
		.get(new RegExp(`^/api/v4/projects/${projectId}/merge_requests/\\d+$`))
		.reply((uri) => {
			const iid = Number(uri.split('/').pop());
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
					diff_refs: { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40) },
					...answer,
				},
			];
		});
}

describe('Promotion reviews in the Inbox', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:gitConnections'],
		modules: ['inbox', 'promotions'],
	});
	let owner: User;
	let connectionId: string;
	let configId: string;
	let reviewRepository: PromotionReviewRepository;

	async function insertReview(iid: number, over: { connectionId?: string } = {}) {
		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			connectionId: over.connectionId ?? connectionId,
			type: 'gitlab',
			remoteReviewId: `${projectId}!${iid}`,
			createdById: owner.id,
		});
		await reviewRepository.update(
			{ id: review.id },
			{ createdAt: new Date(Date.UTC(2026, 9, iid)) },
		);
		await Container.get(PromotionRunRepository).insertRun({
			configId,
			createdById: owner.id,
			direction: 'promote',
			type: 'git',
			details: { schemaVersion: 1, branchName: `n8n-promotion/${iid}`, commitSha: 'c'.repeat(40) },
			reviewId: review.id,
		});
		return review.id;
	}

	async function createConnection(
		provider: object,
		target: { name: string; scope: string; remoteUrl: string },
	) {
		const agent = testServer.publicApiAgentFor(owner);
		const created = await agent.post('/promotions/providers').send(provider);
		expect(created.status, JSON.stringify(created.body)).toBe(201);
		const connection = await agent.post('/promotions/connections').send({
			name: target.name,
			scope: target.scope,
			providerId: created.body.provider.id,
			target: { schemaVersion: 1, remoteUrl: target.remoteUrl },
		});
		expect(connection.status, JSON.stringify(connection.body)).toBe(201);
		return connection.body.id as string;
	}

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
		await Container.get(PromotionConfigRepository).delete({});
		await Container.get(PromotionConnectionRepository).delete({});
		await Container.get(PromotionProviderRepository).delete({});
		await testDb.truncate(['User']);
		owner = await createOwnerWithApiKey();

		const validation = nock(baseUrl)
			.get('/api/v4/user')
			.reply(200, { id: 1 })
			.get('/api/v4/projects')
			.query(true)
			.reply(200, []);
		connectionId = await createConnection(
			{
				name: 'GitLab',
				type: 'gitlab',
				auth: { authType: 'token', password: token },
				config: { schemaVersion: 1, baseUrl },
			},
			{ name: 'Workflows', scope: 'instance', remoteUrl: `${baseUrl}/platform/workflows.git` },
		);
		validation.done();
		const config = await Container.get(PromotionConfigRepository).insertConfig({
			connectionId,
			direction: 'promote',
			name: 'To production',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
		});
		configId = config.id;
	});

	afterEach(() => nock.cleanAll());

	it('syncs reviews from GitLab, lists them by state, and keeps a review GitLab did not answer for', async () => {
		const opened = await insertReview(1);
		const changesRequested = await insertReview(2);
		const merged = await insertReview(3);
		const closed = await insertReview(4);
		const notFound = await insertReview(5);
		const rejected = await insertReview(6);
		const unreachable = await insertReview(7);
		const plainGit = await insertReview(8, {
			connectionId: await createConnection(
				{ name: 'Git', type: 'git', auth: { authType: 'token', username: 'u', password: 'p' } },
				{ name: 'Plain', scope: 'projects', remoteUrl: 'https://example.com/org/repo.git' },
			),
		});
		gitlab({
			1: { state: 'opened' },
			2: { state: 'opened', detailed_merge_status: 'requested_changes' },
			3: { state: 'merged' },
			4: { state: 'closed' },
			6: 401,
			7: 503,
		});

		const open = await inbox(owner, { state: 'open', category: 'waiting' });
		const closedList = await inbox(owner, { state: 'closed' });
		const summary = await testServer.authAgentFor(owner).get('/inbox/summary');

		expect(open.status, JSON.stringify(open.body)).toBe(200);
		expect(open.body.data.data).toHaveLength(6);
		expect(open.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'promotion_review',
					id: opened,
					state: 'open',
					reviewState: 'open',
					title: 'Promotion 1',
					branchName: 'n8n-promotion/1',
					remoteError: null,
				}),
				expect.objectContaining({ id: changesRequested, reviewState: 'changes_requested' }),
				expect.objectContaining({
					id: notFound,
					reviewState: 'open',
					title: null,
					branchName: 'n8n-promotion/5',
					remoteError: 'not_found',
				}),
				expect.objectContaining({ id: rejected, remoteError: 'auth' }),
				expect.objectContaining({ id: unreachable, remoteError: 'unreachable' }),
				expect.objectContaining({ id: plainGit, remoteError: 'no_connection' }),
			]),
		);
		expect(closedList.body.data.data).toHaveLength(2);
		expect(closedList.body.data.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: merged,
					state: 'closed',
					reviewState: 'merged',
					title: 'Promotion 3',
				}),
				expect.objectContaining({
					id: closed,
					state: 'closed',
					reviewState: 'closed',
					title: 'Promotion 4',
				}),
			]),
		);
		expect(summary.body.data.counts).toEqual({ open: 6, closed: 2 });
		expect(JSON.stringify([open.body, closedList.body])).not.toContain(token);
	});

	it('pages promotion reviews with the Inbox cursor, newest activity first', async () => {
		const oldest = await insertReview(1);
		const middle = await insertReview(2);
		const newest = await insertReview(3);
		gitlab({ 1: { state: 'opened' }, 2: { state: 'opened' }, 3: { state: 'opened' } });

		const first = await inbox(owner, { state: 'open', category: 'waiting', limit: '2' });
		const second = await inbox(owner, {
			state: 'open',
			category: 'waiting',
			limit: '2',
			cursor: first.body.data.nextCursor,
		});

		expect(first.body.data.data.map(({ id }: { id: string }) => id)).toEqual([newest, middle]);
		expect(second.body.data.data.map(({ id }: { id: string }) => id)).toEqual([oldest]);
		expect(second.body.data.nextCursor).toBeNull();
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

	it('returns the review detail with GitLab details, and no_connection after the connection is deleted', async () => {
		const id = await insertReview(1);
		gitlab({ 1: { state: 'opened' } });
		const agent = testServer.publicApiAgentFor(owner);

		const detail = await agent.get(`/promotions/reviews/${id}`);

		expect(detail.status, JSON.stringify(detail.body)).toBe(200);
		expect(detail.body).toMatchObject({
			id,
			state: 'open',
			connection: { id: connectionId, name: 'Workflows' },
			config: { id: configId, name: 'To production' },
			createdBy: { id: owner.id },
			branchName: 'n8n-promotion/1',
			headCommitSha: 'b'.repeat(40),
			remote: { title: 'Promotion 1', webUrl: `${baseUrl}/platform/workflows/-/merge_requests/1` },
			remoteError: null,
		});
		expect(JSON.stringify(detail.body)).not.toContain(token);
		expect(detail.body.connection).not.toHaveProperty('provider');

		await Container.get(PromotionConnectionRepository).delete({ id: connectionId });
		const orphan = await agent.get(`/promotions/reviews/${id}`);
		expect(orphan.body).toMatchObject({
			connection: null,
			remote: null,
			remoteError: 'no_connection',
			headCommitSha: null,
		});

		expect((await agent.get(`/promotions/reviews/${uuidv7()}`)).status).toBe(404);
	});

	it('rejects the detail for a member and for a key without the review scope', async () => {
		const id = await insertReview(1);
		const member = await createMemberWithApiKey();
		const listOnlyOwner = await createOwnerWithApiKey({ scopes: ['gitConnection:list'] });

		for (const user of [member, listOnlyOwner]) {
			const response = await testServer.publicApiAgentFor(user).get(`/promotions/reviews/${id}`);
			expect(response.status).toBe(403);
		}
	});
});
