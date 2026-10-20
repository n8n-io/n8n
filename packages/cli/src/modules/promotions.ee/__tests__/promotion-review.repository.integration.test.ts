import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v7 as uuidv7 } from 'uuid';

import { createMember, createOwner } from '@test-integration/db/users';

import { PromotionConfigRepository } from '../database/repositories/promotion-config.repository';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '../database/repositories/promotion-run.repository';

let providerRepository: PromotionProviderRepository;
let connectionRepository: PromotionConnectionRepository;
let configRepository: PromotionConfigRepository;
let runRepository: PromotionRunRepository;
let reviewRepository: PromotionReviewRepository;
let owner: User;
let connectionId: string;
let configId: string;
let providerId: string;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	configRepository = Container.get(PromotionConfigRepository);
	runRepository = Container.get(PromotionRunRepository);
	reviewRepository = Container.get(PromotionReviewRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Runs point at reviews and configs, so delete the runs first.
	await runRepository.delete({});
	await reviewRepository.delete({});
	await configRepository.delete({});
	await connectionRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate(['User']);
	owner = await createOwner();
	// Only one instance connection may exist, so every review of a test shares it.
	const provider = await providerRepository.insertProvider({
		name: 'repo',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: 'encrypted-repo',
	});
	providerId = provider.id;
	const connection = await connectionRepository.insertConnection({
		name: 'repo',
		scope: 'instance',
		providerId: provider.id,
		target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
	});
	connectionId = connection.id;
	const config = await configRepository.insertConfig({
		connectionId,
		direction: 'promote',
		name: 'Promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
	});
	configId = config.id;
});

let reviewCount = 0;

async function insertReview(over: { id?: string; remoteReviewId?: string } = {}) {
	reviewCount += 1;
	const review = await reviewRepository.insertReview({
		id: over.id ?? uuidv7(),
		connectionId,
		type: 'gitlab',
		remoteReviewId: over.remoteReviewId ?? `7!${reviewCount}`,
		createdById: owner.id,
	});
	const run = await runRepository.insertRun({
		configId,
		createdById: owner.id,
		direction: 'promote',
		type: 'git',
		details: {
			schemaVersion: 1,
			branchName: `n8n-promotion/${reviewCount}`,
			commitSha: String(reviewCount).repeat(40).slice(0, 40),
		},
		reviewId: review.id,
	});
	return { review, run };
}

describe('PromotionReviewRepository', () => {
	it('stores a new review as open with the id the caller chose', async () => {
		const chosenReviewId = '018f6b2e-7c3a-7000-8000-0000000000aa';
		const { review, run } = await insertReview({ id: chosenReviewId });

		const found = await reviewRepository.findByIdWithRelations(chosenReviewId);
		expect(found).toMatchObject({
			id: chosenReviewId,
			state: 'open',
			type: 'gitlab',
			connectionId,
			remoteReviewId: review.remoteReviewId,
			lastStateChangeAt: null,
			approvedById: null,
			approvedAt: null,
			createdById: owner.id,
		});
		expect(found?.createdBy?.id).toBe(owner.id);
		expect(found?.connection?.id).toBe(connectionId);
		expect(found?.runs).toHaveLength(1);
		expect(found?.runs[0]).toMatchObject({
			direction: 'promote',
			type: 'git',
			reviewId: review.id,
			details: run.details,
		});
		expect(found?.runs[0]?.createdBy?.id).toBe(owner.id);
		expect(found?.runs[0]?.config?.id).toBe(configId);
		expect(found?.approvedBy).toBeNull();
	});

	it('attaches a recorded run to its review', async () => {
		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			connectionId,
			type: 'gitlab',
			remoteReviewId: '9!1',
			createdById: owner.id,
		});
		const run = await runRepository.insertRun({
			configId,
			createdById: owner.id,
			direction: 'promote',
			type: 'git',
			details: {
				schemaVersion: 1,
				branchName: 'n8n-promotion/later',
				commitSha: 'c'.repeat(40),
			},
			reviewId: null,
		});

		await runRepository.attachReview(run.id, review.id);

		const found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found?.runs).toHaveLength(1);
		expect(found?.runs[0]).toMatchObject({ id: run.id, reviewId: review.id });
	});

	it('keeps the review when its config or approver is deleted', async () => {
		const { review, run } = await insertReview();
		const member = await createMember();
		await reviewRepository.update(
			{ id: review.id },
			{ approvedById: member.id, approvedAt: new Date() },
		);

		await connectionRepository.delete({ id: connectionId });
		await Container.get(UserRepository).delete({ id: member.id });

		const found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found).toMatchObject({ approvedById: null, connectionId: null });
		expect(found?.connection).toBeNull();
		expect(found?.runs[0]?.configId).toBeNull();
		expect(found?.runs[0]?.config).toBeNull();
		expect(found?.runs[0]?.direction).toBe('promote');
		expect(found?.runs[0]?.details).toEqual(run.details);
		expect(found?.approvedBy).toBeNull();
		expect(found?.runs[0]?.createdById).toBe(owner.id);
		expect(found?.runs[0]?.createdBy?.id).toBe(owner.id);
	});

	it('keeps the review when its creator is deleted', async () => {
		const { review } = await insertReview();

		await Container.get(UserRepository).delete({ id: owner.id });

		const found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found).toMatchObject({ createdById: null });
		expect(found?.createdBy).toBeNull();
		expect(found?.runs[0]?.createdById).toBeNull();
		expect(found?.runs[0]?.createdBy).toBeNull();
	});

	it('lists newest first and filters by tab', async () => {
		const { review: first } = await insertReview();
		const { review: merged } = await insertReview();
		const { review: closed } = await insertReview();
		// Three inserts can share a millisecond, so pin the creation order.
		for (const [index, review] of [first, merged, closed].entries()) {
			await reviewRepository.update({ id: review.id }, { createdAt: new Date(1_000_000 * index) });
		}
		await reviewRepository.update(
			{ id: merged.id },
			{ state: 'merged', lastStateChangeAt: new Date() },
		);
		await reviewRepository.update(
			{ id: closed.id },
			{ state: 'closed', lastStateChangeAt: new Date() },
		);

		const all = await reviewRepository.listReviews({ offset: 0, limit: 10 });
		expect(all.count).toBe(3);
		expect(all.data.map((r) => r.id)).toEqual([closed.id, merged.id, first.id]);

		const open = await reviewRepository.listReviews({ tab: 'open', offset: 0, limit: 10 });
		expect(open.data.map((r) => r.id)).toEqual([first.id]);
		expect(open.data[0]?.createdBy?.id).toBe(owner.id);

		const done = await reviewRepository.listReviews({ tab: 'closed', offset: 0, limit: 10 });
		expect(done.count).toBe(2);
		expect(done.data.map((r) => r.id)).toEqual([closed.id, merged.id]);

		const page = await reviewRepository.listReviews({ offset: 1, limit: 1 });
		expect(page.count).toBe(3);
		expect(page.data.map((r) => r.id)).toEqual([merged.id]);
	});

	it('pages stably when reviews share a creation time', async () => {
		const olderReviewId = '018f6b2e-7c3a-7000-8000-000000000001';
		const newerReviewId = '018f6b2e-7c3a-7000-8000-000000000002';
		const { review: older } = await insertReview({ id: olderReviewId });
		const { review: newer } = await insertReview({ id: newerReviewId });
		const createdAt = new Date('2026-01-01T00:00:00.000Z');
		await reviewRepository.update({ id: older.id }, { createdAt });
		await reviewRepository.update({ id: newer.id }, { createdAt });

		const first = await reviewRepository.listReviews({ offset: 0, limit: 1 });
		const second = await reviewRepository.listReviews({ offset: 1, limit: 1 });

		expect(first.data.map((r) => r.id)).toEqual([newerReviewId]);
		expect(second.data.map((r) => r.id)).toEqual([olderReviewId]);
	});

	it('rejects a second review with the same remote id on one connection', async () => {
		await insertReview({ remoteReviewId: '7!1' });

		await expect(insertReview({ remoteReviewId: '7!1' })).rejects.toThrow();
	});

	it('allows the same remote id on another connection', async () => {
		await insertReview({ remoteReviewId: '7!1' });
		const other = await connectionRepository.insertConnection({
			name: 'other',
			scope: 'projects',
			providerId,
			target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/other.git' },
		});

		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			connectionId: other.id,
			type: 'gitlab',
			remoteReviewId: '7!1',
			createdById: owner.id,
		});

		expect(review.remoteReviewId).toBe('7!1');
	});

	it('allows several reviews without a remote id', async () => {
		await reviewRepository.insertReview({
			id: uuidv7(),
			connectionId,
			type: 'gitlab',
			remoteReviewId: null,
			createdById: owner.id,
		});
		await reviewRepository.insertReview({
			id: uuidv7(),
			connectionId,
			type: 'gitlab',
			remoteReviewId: null,
			createdById: owner.id,
		});

		const listed = await reviewRepository.listReviews({ offset: 0, limit: 10 });
		expect(listed.count).toBe(2);
	});
});
