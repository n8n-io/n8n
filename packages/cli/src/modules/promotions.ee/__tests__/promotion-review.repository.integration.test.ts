import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '@test-integration/db/users';

import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';

let providerRepository: PromotionProviderRepository;
let connectionRepository: PromotionConnectionRepository;
let reviewRepository: PromotionReviewRepository;
let owner: User;
let connectionId: string;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	connectionRepository = Container.get(PromotionConnectionRepository);
	reviewRepository = Container.get(PromotionReviewRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Delete children before parents to satisfy the foreign keys.
	await reviewRepository.delete({});
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
	const connection = await connectionRepository.insertConnection({
		name: 'repo',
		scope: 'instance',
		providerId: provider.id,
		target: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
	});
	connectionId = connection.id;
});

let reviewCount = 0;

async function insertReview(
	over: Partial<Parameters<PromotionReviewRepository['insertReview']>[0]> = {},
) {
	reviewCount += 1;
	return await reviewRepository.insertReview({
		id: `review-${reviewCount}`,
		connectionId,
		createdById: owner.id,
		branchName: `n8n-promotion/${reviewCount}`,
		commitSha: String(reviewCount).repeat(40).slice(0, 40),
		remoteReviewId: `gitlab:7!${reviewCount}`,
		...over,
	});
}

describe('PromotionReviewRepository', () => {
	it('stores a new review as open with the id the caller chose', async () => {
		const review = await insertReview({ id: 'chosen-id' });

		const found = await reviewRepository.findByIdWithRelations('chosen-id');
		expect(found).toMatchObject({
			id: 'chosen-id',
			state: 'open',
			branchName: review.branchName,
			remoteReviewId: review.remoteReviewId,
			mergedAt: null,
			closedAt: null,
			approvedById: null,
			approvedAt: null,
		});
		expect(found?.createdBy?.id).toBe(owner.id);
		expect(found?.connection?.id).toBe(review.connectionId);
		expect(found?.approvedBy).toBeNull();
	});

	it('keeps the review when its connection or creator is deleted', async () => {
		const review = await insertReview();
		const member = await createMember();
		await reviewRepository.claimApproval(review.id, member.id);

		await connectionRepository.delete({ id: review.connectionId! });
		await Container.get(UserRepository).delete({ id: member.id });

		const found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found).toMatchObject({ connectionId: null, approvedById: null });
		expect(found?.connection).toBeNull();
		expect(found?.approvedBy).toBeNull();
	});

	it('lists newest first and filters by tab', async () => {
		const first = await insertReview();
		const merged = await insertReview();
		const closed = await insertReview();
		// Three inserts can share a millisecond, so pin the creation order.
		for (const [index, review] of [first, merged, closed].entries()) {
			await reviewRepository.update({ id: review.id }, { createdAt: new Date(1_000_000 * index) });
		}
		await reviewRepository.recordSync(merged.id, {
			state: 'merged',
			mergedAt: new Date(),
			closedAt: null,
		});
		await reviewRepository.recordSync(closed.id, {
			state: 'unavailable',
			mergedAt: null,
			closedAt: null,
		});

		const all = await reviewRepository.listReviews({ offset: 0, limit: 10 });
		expect(all.count).toBe(3);
		expect(all.data.map((r) => r.id)).toEqual([closed.id, merged.id, first.id]);

		const open = await reviewRepository.listReviews({ tab: 'open', offset: 0, limit: 10 });
		expect(open.data.map((r) => r.id)).toEqual([first.id]);

		const done = await reviewRepository.listReviews({ tab: 'closed', offset: 0, limit: 10 });
		expect(done.count).toBe(2);
		expect(done.data.map((r) => r.id)).toEqual([closed.id, merged.id]);

		const page = await reviewRepository.listReviews({ offset: 1, limit: 1 });
		expect(page.count).toBe(3);
		expect(page.data.map((r) => r.id)).toEqual([merged.id]);
	});

	it('finds only open reviews for a refresh', async () => {
		const open = await insertReview();
		const merged = await insertReview();
		await reviewRepository.recordSync(merged.id, {
			state: 'merged',
			mergedAt: new Date(),
			closedAt: null,
		});

		const found = await reviewRepository.findOpenReviews();
		expect(found.map((r) => r.id)).toEqual([open.id]);
		expect(found[0].connection?.id).toBe(open.connectionId);
	});

	it('lets only the first approver claim a review and can release the claim', async () => {
		const review = await insertReview();
		const member = await createMember();

		await expect(reviewRepository.claimApproval(review.id, owner.id)).resolves.toBe(true);
		await expect(reviewRepository.claimApproval(review.id, member.id)).resolves.toBe(false);

		let found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found?.approvedById).toBe(owner.id);
		expect(found?.approvedAt).toBeInstanceOf(Date);

		await reviewRepository.releaseApproval(review.id);
		found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found).toMatchObject({ approvedById: null, approvedAt: null });

		await expect(reviewRepository.claimApproval(review.id, member.id)).resolves.toBe(true);
	});

	it('does not let a closed review be approved', async () => {
		const review = await insertReview();
		await reviewRepository.recordSync(review.id, {
			state: 'closed',
			mergedAt: null,
			closedAt: new Date(),
		});

		await expect(reviewRepository.claimApproval(review.id, owner.id)).resolves.toBe(false);
	});
});
