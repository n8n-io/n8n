import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { PromotionChanges } from '@n8n/api-types';
import {
	ensurePromotionChanges,
	getPromotionChangesEntry,
	invalidatePromotionChanges,
	markPromotionChangesStale,
	refreshPromotionChanges,
} from './promotionChanges.cache';
import * as api from '../promotions.api';

vi.mock('../promotions.api');

const context = {} as IRestApiContext;

const changes = (count: number): PromotionChanges => ({
	commitSha: 'a'.repeat(40),
	changes: Array.from({ length: count }, (_, index) => ({
		id: `workflow-${index}`,
		name: `Workflow ${index}`,
		type: 'workflow',
		status: 'new',
		version: null,
		updatedAt: null,
		updatedBy: null,
		dependencyCount: 0,
	})),
});

describe('promotionChanges.cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		invalidatePromotionChanges();
		vi.mocked(api.getPromotableChanges).mockResolvedValue(changes(2));
	});

	it('should join a running request instead of starting a second one', async () => {
		await Promise.all([
			refreshPromotionChanges(context, 'project-a', 'apply'),
			refreshPromotionChanges(context, 'project-a', 'apply'),
		]);

		expect(api.getPromotableChanges).toHaveBeenCalledTimes(1);
	});

	it('should keep a reader attached across an invalidate', async () => {
		const entry = getPromotionChangesEntry('project-a', 'apply');
		await ensurePromotionChanges(context, 'project-a', 'apply');
		expect(entry.changes.value).toHaveLength(2);

		invalidatePromotionChanges();
		expect(entry.changes.value).toHaveLength(0);
		expect(entry.lastRefreshedAt.value).toBeNull();

		vi.mocked(api.getPromotableChanges).mockResolvedValue(changes(3));
		await ensurePromotionChanges(context, 'project-a', 'apply');
		expect(entry.changes.value).toHaveLength(3);
	});

	it('should drop a request that an invalidate outran', async () => {
		let answer: (changes: PromotionChanges) => void = () => {};
		vi.mocked(api.getPromotableChanges).mockReturnValueOnce(
			new Promise<PromotionChanges>((resolve) => {
				answer = resolve;
			}),
		);
		const entry = getPromotionChangesEntry('project-a', 'apply');
		const pending = refreshPromotionChanges(context, 'project-a', 'apply');

		invalidatePromotionChanges();
		answer(changes(2));
		await pending;

		expect(entry.changes.value).toHaveLength(0);
		expect(entry.hasLoaded.value).toBe(false);
		// The next reader starts a fresh request instead of joining the dead one.
		await ensurePromotionChanges(context, 'project-a', 'apply');
		expect(api.getPromotableChanges).toHaveBeenCalledTimes(2);
		expect(entry.changes.value).toHaveLength(2);
	});

	it('should reload a stale entry on the next ensure and keep its rows meanwhile', async () => {
		const entry = getPromotionChangesEntry('project-a', 'apply');
		await ensurePromotionChanges(context, 'project-a', 'apply');

		markPromotionChangesStale();
		expect(entry.changes.value).toHaveLength(2);

		vi.mocked(api.getPromotableChanges).mockResolvedValue(changes(1));
		await ensurePromotionChanges(context, 'project-a', 'apply');
		expect(api.getPromotableChanges).toHaveBeenCalledTimes(2);
		expect(entry.changes.value).toHaveLength(1);
	});
});
