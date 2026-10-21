import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v7 as uuidv7 } from 'uuid';

import { createMember, createOwner } from '@test-integration/db/users';

import type { InboxSourceBoundary } from '../../inbox/inbox-source.registry';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionReviewRepository } from '../database/repositories/promotion-review.repository';
import { PromotionRunRepository } from '../database/repositories/promotion-run.repository';

let providerRepository: PromotionProviderRepository;
let environmentRepository: PromotionEnvironmentRepository;
let runRepository: PromotionRunRepository;
let reviewRepository: PromotionReviewRepository;
let owner: User;
let environmentId: string;
let providerId: string;

beforeAll(async () => {
	await testModules.loadModules(['promotions']);
	await testDb.init();

	providerRepository = Container.get(PromotionProviderRepository);
	environmentRepository = Container.get(PromotionEnvironmentRepository);
	runRepository = Container.get(PromotionRunRepository);
	reviewRepository = Container.get(PromotionReviewRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	// Runs point at reviews and environments, so delete the runs first.
	await runRepository.delete({});
	await reviewRepository.delete({});
	await environmentRepository.delete({});
	await providerRepository.delete({});
	await testDb.truncate(['User']);
	owner = await createOwner();
	// Only one instance Promote environment may exist, so every review of a test shares it.
	const provider = await providerRepository.insertProvider({
		name: 'repo',
		type: 'git',
		authType: 'token',
		config: { schemaVersion: 1 },
		auth: 'encrypted-repo',
	});
	providerId = provider.id;
	const environment = await environmentRepository.insertEnvironment({
		name: 'repo',
		scope: 'instance',
		providerId: provider.id,
		remote: { schemaVersion: 1, remoteUrl: 'https://example.com/org/repo.git' },
		direction: 'promote',
		settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
	});
	environmentId = environment.id;
});

let reviewCount = 0;

async function insertReview(over: { id?: string; remoteReviewId?: string } = {}) {
	reviewCount += 1;
	const review = await reviewRepository.insertReview({
		id: over.id ?? uuidv7(),
		environmentId,
		type: 'gitlab',
		remoteReviewId: over.remoteReviewId ?? `7!${reviewCount}`,
		createdById: owner.id,
	});
	const run = await runRepository.insertRun({
		environmentId,
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
			environmentId,
			remoteReviewId: review.remoteReviewId,
			lastStateChangeAt: null,
			approvedById: null,
			approvedAt: null,
			createdById: owner.id,
		});
		expect(found?.createdBy?.id).toBe(owner.id);
		expect(found?.environment?.id).toBe(environmentId);
		expect(found?.runs).toHaveLength(1);
		expect(found?.runs[0]).toMatchObject({
			direction: 'promote',
			type: 'git',
			reviewId: review.id,
			details: run.details,
		});
		expect(found?.runs[0]?.createdBy?.id).toBe(owner.id);
		expect(found?.approvedBy).toBeNull();
	});

	it('attaches a recorded run to its review', async () => {
		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			environmentId,
			type: 'gitlab',
			remoteReviewId: '9!1',
			createdById: owner.id,
		});
		const run = await runRepository.insertRun({
			environmentId,
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

	it('keeps the review when its environment or approver is deleted', async () => {
		const { review, run } = await insertReview();
		const member = await createMember();
		await reviewRepository.update(
			{ id: review.id },
			{ approvedById: member.id, approvedAt: new Date() },
		);

		await environmentRepository.delete({ id: environmentId });
		await Container.get(UserRepository).delete({ id: member.id });

		const found = await reviewRepository.findByIdWithRelations(review.id);
		expect(found).toMatchObject({ approvedById: null, environmentId: null });
		expect(found?.environment).toBeNull();
		expect(found?.runs[0]?.environmentId).toBeNull();
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

	it('lists by latest activity, filters by Inbox state, and counts both states', async () => {
		const { review: open } = await insertReview();
		const { review: merged } = await insertReview();
		const { review: closed } = await insertReview();
		await reviewRepository.update({ id: open.id }, { createdAt: new Date('2026-01-01') });
		await reviewRepository.update(
			{ id: merged.id },
			{
				state: 'merged',
				createdAt: new Date('2026-01-02'),
				lastStateChangeAt: new Date('2026-01-05'),
			},
		);
		await reviewRepository.update(
			{ id: closed.id },
			{
				state: 'closed',
				createdAt: new Date('2026-01-03'),
				lastStateChangeAt: new Date('2026-01-04'),
			},
		);

		const openRows = await reviewRepository.findForInbox({ state: 'open', limit: 10 });
		const closedRows = await reviewRepository.findForInbox({ state: 'closed', limit: 10 });

		expect(openRows.map((r) => r.id)).toEqual([open.id]);
		expect(openRows[0]?.environment?.id).toBe(environmentId);
		expect(closedRows.map((r) => r.id)).toEqual([merged.id, closed.id]);
		expect(await reviewRepository.countForInbox()).toEqual({ open: 1, closed: 2 });
	});

	it('pages from each Inbox boundary when reviews share a timestamp', async () => {
		const firstReviewId = '018f6b2e-7c3a-7000-8000-000000000001';
		const secondReviewId = '018f6b2e-7c3a-7000-8000-000000000002';
		await insertReview({ id: firstReviewId });
		await insertReview({ id: secondReviewId });
		const updatedAt = new Date('2026-01-01T00:00:00.000Z');
		await reviewRepository.update({ id: firstReviewId }, { createdAt: updatedAt });
		await reviewRepository.update({ id: secondReviewId }, { createdAt: updatedAt });
		const page = async (boundary?: InboxSourceBoundary) =>
			(await reviewRepository.findForInbox({ state: 'open', limit: 10, boundary })).map(
				(r) => r.id,
			);

		expect(await page()).toEqual([firstReviewId, secondReviewId]);
		expect(await page({ mode: 'afterItem', updatedAt, id: firstReviewId })).toEqual([
			secondReviewId,
		]);
		expect(await page({ mode: 'beforeOrAtTime', updatedAt })).toEqual([
			firstReviewId,
			secondReviewId,
		]);
		expect(await page({ mode: 'beforeTime', updatedAt })).toEqual([]);
	});

	it('records a host state only while the review is open', async () => {
		const { review: open } = await insertReview();
		const { review: merged } = await insertReview();
		await reviewRepository.update({ id: merged.id }, { state: 'merged' });
		const at = new Date('2026-10-16T10:00:00.000Z');

		await expect(reviewRepository.recordHostState(open.id, 'closed', at)).resolves.toBe(true);
		await expect(reviewRepository.recordHostState(merged.id, 'open', at)).resolves.toBe(false);

		expect(await reviewRepository.findOneBy({ id: open.id })).toMatchObject({
			state: 'closed',
			lastStateChangeAt: at,
		});
		expect(await reviewRepository.findOneBy({ id: merged.id })).toMatchObject({
			state: 'merged',
			lastStateChangeAt: null,
		});
	});

	it('rejects a second review with the same remote id on one environment', async () => {
		await insertReview({ remoteReviewId: '7!1' });

		await expect(insertReview({ remoteReviewId: '7!1' })).rejects.toThrow();
	});

	it('allows the same remote id on another environment', async () => {
		await insertReview({ remoteReviewId: '7!1' });
		const other = await environmentRepository.insertEnvironment({
			name: 'other',
			scope: 'projects',
			providerId,
			remote: { schemaVersion: 1, remoteUrl: 'https://example.com/org/other.git' },
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
		});

		const review = await reviewRepository.insertReview({
			id: uuidv7(),
			environmentId: other.id,
			type: 'gitlab',
			remoteReviewId: '7!1',
			createdById: owner.id,
		});

		expect(review.remoteReviewId).toBe('7!1');
	});

	it('allows several reviews without a remote id', async () => {
		await reviewRepository.insertReview({
			id: uuidv7(),
			environmentId,
			type: 'gitlab',
			remoteReviewId: null,
			createdById: owner.id,
		});
		await reviewRepository.insertReview({
			id: uuidv7(),
			environmentId,
			type: 'gitlab',
			remoteReviewId: null,
			createdById: owner.id,
		});

		expect(await reviewRepository.countForInbox()).toEqual({ open: 2, closed: 0 });
	});
});
