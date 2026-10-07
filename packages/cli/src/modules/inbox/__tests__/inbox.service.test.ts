import type {
	InboxItem,
	InboxSelfHealingItem,
	InboxSourceType,
	InboxWorkflowReviewItem,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { InboxSourceRegistry, type InboxSourceQuery } from '../inbox-source.registry';
import { InboxService } from '../inbox.service';

const timestamp = (hour: number) => new Date(Date.UTC(2026, 9, 7, hour)).toISOString();

function review(id: string, hour: number): InboxWorkflowReviewItem {
	return {
		type: 'workflow_review',
		id,
		state: 'open',
		decision: 'pending',
		projectId: 'project',
		title: id,
		workflowName: 'Workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		createdAt: timestamp(hour),
		updatedAt: timestamp(hour),
	};
}

function result(id: string, hour: number): InboxSelfHealingItem {
	return {
		type: 'self_healing_result',
		id,
		state: 'open',
		projectId: 'project',
		workflowId: 'workflow',
		workflowName: 'Workflow',
		summary: id,
		outcome: 'fix_ready',
		createdAt: timestamp(hour),
		updatedAt: timestamp(hour),
		completedAt: timestamp(hour),
	};
}

function createSource(type: InboxSourceType, rows: InboxItem[] = []) {
	return {
		type,
		isEnabled: vi.fn(async () => true),
		list: vi.fn(async (_user: User, { state, boundary, limit }: InboxSourceQuery) =>
			rows
				.filter((item) => {
					if (item.state !== state) return false;
					if (!boundary) return true;
					const difference = Date.parse(item.createdAt) - boundary.createdAt.getTime();
					return (
						difference < 0 ||
						(difference === 0 &&
							(boundary.mode === 'atOrBeforeTime' ||
								(boundary.mode === 'afterItem' && item.id > boundary.id)))
					);
				})
				.slice(0, limit),
		),
		count: vi.fn(async (_user: User) => ({
			open: rows.filter(({ state }) => state === 'open').length,
			closed: rows.filter(({ state }) => state === 'closed').length,
		})),
	};
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('InboxService', () => {
	const user = mock<User>({ id: 'user' });
	let registry: InboxSourceRegistry;
	let logger: ReturnType<typeof mock<Logger>>;
	let service: InboxService;

	beforeEach(() => {
		registry = new InboxSourceRegistry();
		logger = mock<Logger>();
		service = new InboxService(registry, logger);
	});

	it('pages through both sources without skipping prefetched rows', async () => {
		const reviews = createSource('workflow_review', [
			review('r12', 12),
			review('r10', 10),
			review('r8', 8),
		]);
		const results = createSource('self_healing_result', [
			result('a11', 11),
			result('a9', 9),
			result('a7', 7),
		]);
		registry.register(reviews);
		registry.register(results);

		const first = await service.list(user, { state: 'open', limit: 2 });
		const second = await service.list(user, { state: 'open', limit: 2, cursor: first.nextCursor! });
		const third = await service.list(user, { state: 'open', limit: 2, cursor: second.nextCursor! });

		expect(first.data.map(({ id }) => id)).toEqual(['r12', 'a11']);
		expect(second.data.map(({ id }) => id)).toEqual(['r10', 'a9']);
		expect(third.data.map(({ id }) => id)).toEqual(['r8', 'a7']);
		expect(third).toMatchObject({ hasMore: false, nextCursor: null, partial: false });
		expect(reviews.list).toHaveBeenNthCalledWith(2, user, {
			state: 'open',
			limit: 3,
			boundary: { mode: 'beforeTime', createdAt: new Date(timestamp(11)) },
		});
		expect(results.list).toHaveBeenNthCalledWith(2, user, {
			state: 'open',
			limit: 3,
			boundary: { mode: 'afterItem', createdAt: new Date(timestamp(11)), id: 'a11' },
		});
		expect(reviews.count).not.toHaveBeenCalled();
		expect(results.count).not.toHaveBeenCalled();
	});

	it('excludes Assistant checks and reads from Authored pagination', async () => {
		const reviews = createSource('workflow_review', [review('r12', 12), review('r10', 10)]);
		const results = createSource('self_healing_result', [result('a13', 13)]);
		results.isEnabled.mockRejectedValue(new Error('Availability failed'));
		registry.register(reviews);
		registry.register(results);
		const query = { state: 'open', category: 'authored', limit: 1 } as const;
		const first = await service.list(user, query);
		const second = await service.list(user, { ...query, cursor: first.nextCursor! });
		expect(first).toMatchObject({ partial: false, failedSources: [], disabledSources: [] });
		expect(first.data.map(({ id }) => id)).toEqual(['r12']);
		expect(second.data.map(({ id }) => id)).toEqual(['r10']);
		expect(reviews.list).toHaveBeenCalledWith(
			user,
			expect.objectContaining({ category: 'authored' }),
		);
		expect(results.isEnabled).not.toHaveBeenCalled();
		expect(results.list).not.toHaveBeenCalled();
	});

	it('merges Assistant results into Waiting and keeps its source failures isolated', async () => {
		registry.register(createSource('workflow_review', [review('r12', 12)]));
		const results = createSource('self_healing_result', [result('a13', 13)]);
		registry.register(results);
		const query = { state: 'open', category: 'waiting', limit: 15 } as const;
		const page = await service.list(user, query);
		expect(page.data.map(({ id }) => id)).toEqual(['a13', 'r12']);
		results.list.mockRejectedValueOnce(new Error('Read failed'));
		await expect(service.list(user, query)).resolves.toMatchObject({
			partial: true,
			failedSources: ['self_healing_result'],
			data: [review('r12', 12)],
		});
	});

	it.each(['waiting', 'authored'] as const)(
		'rejects %s on Closed before reading sources',
		async (category) => {
			const source = createSource('workflow_review');
			registry.register(source);
			await expect(
				service.list(user, { state: 'closed', category, limit: 15 }),
			).rejects.toBeInstanceOf(BadRequestError);
			expect(source.isEnabled).not.toHaveBeenCalled();
		},
	);

	it('rejects cursors used with another category or an excluded source', async () => {
		const source = createSource('workflow_review');
		registry.register(source);
		const cursor = {
			version: 1,
			state: 'open',
			category: 'authored',
			after: { type: 'workflow_review', id: 'r12', createdAt: timestamp(12) },
			activeSources: ['workflow_review'],
			failedSources: [],
		};
		for (const category of [undefined, 'waiting'] as const) {
			await expect(
				service.list(user, { state: 'open', category, limit: 15, cursor: encode(cursor) }),
			).rejects.toBeInstanceOf(BadRequestError);
		}
		for (const sourceSets of [
			{ activeSources: ['workflow_review', 'self_healing_result'], failedSources: [] },
			{ activeSources: ['workflow_review'], failedSources: ['self_healing_result'] },
		]) {
			await expect(
				service.list(user, {
					state: 'open',
					category: 'authored',
					limit: 15,
					cursor: encode({ ...cursor, ...sourceSets }),
				}),
			).rejects.toBeInstanceOf(BadRequestError);
		}
		await expect(
			service.list(user, {
				state: 'open',
				category: 'waiting',
				limit: 15,
				cursor: encode({ ...cursor, category: undefined }),
			}),
		).rejects.toBeInstanceOf(BadRequestError);
		expect(source.isEnabled).not.toHaveBeenCalled();
	});

	it('uses fixed source order for equal timestamps, regardless of registration order', async () => {
		registry.register(createSource('self_healing_result', [result('1', 12), result('2', 12)]));
		registry.register(createSource('workflow_review', [review('1', 12), review('2', 12)]));
		const keys: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await service.list(user, { state: 'open', limit: 1, cursor });
			keys.push(...page.data.map(({ type, id }) => `${type}:${id}`));
			cursor = page.nextCursor ?? undefined;
		} while (cursor);
		expect(keys).toEqual([
			'workflow_review:1',
			'workflow_review:2',
			'self_healing_result:1',
			'self_healing_result:2',
		]);
	});

	it('compares equal timestamps with different ISO precision by source order', async () => {
		registry.register(createSource('self_healing_result', [result('a', 12)]));
		registry.register(
			createSource('workflow_review', [{ ...review('r', 12), createdAt: '2026-10-07T12:00:00Z' }]),
		);
		const page = await service.list(user, { state: 'open', limit: 2 });
		expect(page.data.map(({ id }) => id)).toEqual(['r', 'a']);
	});

	it('preserves the source database order when IDs use a different collation', async () => {
		registry.register(createSource('workflow_review', [review('a', 12), review('B', 12)]));
		registry.register(createSource('self_healing_result', [result('a', 12)]));
		const page = await service.list(user, { state: 'open', limit: 3 });
		expect(page.data.map(({ type, id }) => `${type}:${id}`)).toEqual([
			'workflow_review:a',
			'workflow_review:B',
			'self_healing_result:a',
		]);
	});

	it('continues after the anchor row is deleted', async () => {
		const rows = [result('a11', 11), result('a9', 9)];
		registry.register(createSource('workflow_review', [review('r12', 12), review('r10', 10)]));
		registry.register(createSource('self_healing_result', rows));
		const first = await service.list(user, { state: 'open', limit: 2 });
		rows.shift();
		const next = await service.list(user, { state: 'open', limit: 2, cursor: first.nextCursor! });
		expect(next.data.map(({ id }) => id)).toEqual(['r10', 'a9']);
	});

	it('passes the current user and tab to each source', async () => {
		const closed = { ...review('closed', 11), state: 'closed' as const };
		const source = createSource('workflow_review', [review('open', 12), closed]);
		registry.register(source);
		const page = await service.list(user, { state: 'closed', limit: 15 });
		expect(page.data).toEqual([closed]);
		expect(source.list).toHaveBeenCalledWith(user, {
			state: 'closed',
			limit: 16,
			boundary: undefined,
		});
	});

	it('keeps a failed source out of later pages until a fresh request', async () => {
		const reviews = createSource('workflow_review', [
			review('r12', 12),
			review('r10', 10),
			review('r8', 8),
		]);
		const results = createSource('self_healing_result', [result('a13', 13)]);
		results.list.mockRejectedValueOnce(new Error('Read failed'));
		registry.register(reviews);
		registry.register(results);
		const first = await service.list(user, { state: 'open', limit: 1 });
		const next = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		expect(first).toMatchObject({ partial: true, failedSources: ['self_healing_result'] });
		expect(next).toMatchObject({ partial: true, failedSources: ['self_healing_result'] });
		expect(next.data.map(({ id }) => id)).toEqual(['r10']);
		expect(results.list).toHaveBeenCalledTimes(1);

		const refreshed = await service.list(user, { state: 'open', limit: 1 });
		expect(refreshed.data.map(({ id }) => id)).toEqual(['a13']);
		expect(refreshed.partial).toBe(false);
	});

	it('carries a failure on a later page through the rest of the cursor chain', async () => {
		registry.register(
			createSource('workflow_review', [review('r12', 12), review('r10', 10), review('r8', 8)]),
		);
		const results = createSource('self_healing_result', [result('a11', 11), result('a9', 9)]);
		registry.register(results);
		const first = await service.list(user, { state: 'open', limit: 1 });
		results.list.mockRejectedValueOnce(new Error('Read failed'));
		const second = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		const third = await service.list(user, { state: 'open', limit: 1, cursor: second.nextCursor! });
		expect(second.data.map(({ id }) => id)).toEqual(['r10']);
		expect(third.data.map(({ id }) => id)).toEqual(['r8']);
		expect(third).toMatchObject({ partial: true, failedSources: ['self_healing_result'] });
		expect(results.list).toHaveBeenCalledTimes(2);
	});

	it('reports current and earlier failures when the last healthy source fails', async () => {
		const reviews = createSource('workflow_review', [review('r12', 12), review('r10', 10)]);
		const results = createSource('self_healing_result');
		results.list.mockRejectedValue(new Error('Result read failed'));
		registry.register(reviews);
		registry.register(results);
		const first = await service.list(user, { state: 'open', limit: 1 });
		reviews.list.mockRejectedValue(new Error('Review read failed'));
		await expect(
			service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! }),
		).rejects.toMatchObject({
			httpStatusCode: 503,
			meta: {
				partial: true,
				failedSources: ['self_healing_result', 'workflow_review'],
				disabledSources: [],
			},
		});
		expect(results.list).toHaveBeenCalledTimes(1);
	});

	it('isolates an availability error from the healthy source', async () => {
		const reviews = createSource('workflow_review', [review('r12', 12)]);
		const results = createSource('self_healing_result');
		results.isEnabled.mockRejectedValue(new Error('Availability failed'));
		registry.register(reviews);
		registry.register(results);
		const page = await service.list(user, { state: 'open', limit: 15 });
		expect(page.data).toEqual([review('r12', 12)]);
		expect(page.failedSources).toEqual(['self_healing_result']);
		expect(results.list).not.toHaveBeenCalled();
	});

	it('distinguishes an empty healthy source from a failed source', async () => {
		registry.register(createSource('workflow_review'));
		const results = createSource('self_healing_result');
		results.list.mockRejectedValue(new Error('Read failed'));
		registry.register(results);
		await expect(service.list(user, { state: 'open', limit: 15 })).resolves.toMatchObject({
			data: [],
			partial: true,
			hasMore: false,
			nextCursor: null,
		});
	});

	it('returns a retryable error with source metadata when all reads fail', async () => {
		for (const type of ['workflow_review', 'self_healing_result'] as const) {
			const source = createSource(type);
			source.list.mockRejectedValue(new Error('Private query details'));
			registry.register(source);
		}
		const request = service.list(user, { state: 'open', limit: 15 });
		await expect(request).rejects.toBeInstanceOf(ServiceUnavailableError);
		await expect(request).rejects.toMatchObject({
			httpStatusCode: 503,
			message: 'Inbox is temporarily unavailable',
			meta: {
				partial: true,
				failedSources: ['workflow_review', 'self_healing_result'],
				disabledSources: [],
			},
		});
		expect(logger.warn).toHaveBeenCalledTimes(2);
	});

	it('reports a disabled source without reading it', async () => {
		const source = createSource('workflow_review', [review('r12', 12)]);
		source.isEnabled.mockResolvedValue(false);
		registry.register(source);
		await expect(service.list(user, { state: 'open', limit: 15 })).resolves.toEqual({
			data: [],
			hasMore: false,
			nextCursor: null,
			partial: false,
			failedSources: [],
			disabledSources: ['workflow_review'],
		});
		expect(source.list).not.toHaveBeenCalled();
	});

	it('checks current availability on later pages and removes a disabled source', async () => {
		const reviews = createSource('workflow_review', [review('r12', 12), review('r10', 10)]);
		const results = createSource('self_healing_result', [result('a11', 11), result('a9', 9)]);
		registry.register(reviews);
		registry.register(results);
		const first = await service.list(user, { state: 'open', limit: 1 });
		reviews.isEnabled.mockResolvedValue(false);
		const second = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		expect(second.data.map(({ id }) => id)).toEqual(['a11']);
		expect(second.disabledSources).toEqual(['workflow_review']);
		expect(reviews.list).toHaveBeenCalledTimes(1);
	});

	it('admits a newly available source only on a fresh request', async () => {
		registry.register(createSource('workflow_review', [review('r12', 12), review('r10', 10)]));
		const results = createSource('self_healing_result', [result('a13', 13)]);
		results.isEnabled.mockResolvedValue(false);
		registry.register(results);
		const first = await service.list(user, { state: 'open', limit: 1 });
		results.isEnabled.mockResolvedValue(true);
		const next = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		expect(next.data.map(({ id }) => id)).toEqual(['r10']);
		expect(results.list).not.toHaveBeenCalled();
		const refreshed = await service.list(user, { state: 'open', limit: 1 });
		expect(refreshed.data.map(({ id }) => id)).toEqual(['a13']);
	});

	it('treats a recognized source absent after restart as disabled', async () => {
		registry.register(createSource('workflow_review', [review('r12', 12), review('r10', 10)]));
		const cursor = encode({
			version: 1,
			state: 'open',
			after: { type: 'self_healing_result', id: 'a11', createdAt: timestamp(11) },
			activeSources: ['workflow_review', 'self_healing_result'],
			failedSources: [],
		});
		const page = await service.list(user, { state: 'open', limit: 15, cursor });
		expect(page.data.map(({ id }) => id)).toEqual(['r10']);
		expect(page.disabledSources).toEqual(['self_healing_result']);
	});

	describe('cursor validation', () => {
		const validCursor = {
			version: 1,
			state: 'open',
			after: { type: 'workflow_review', id: 'row', createdAt: timestamp(12) },
			activeSources: ['workflow_review'],
			failedSources: [],
		};
		it.each([
			['invalid encoding', '!!!'],
			['invalid JSON', Buffer.from('not JSON').toString('base64url')],
			['large cursor', 'x'.repeat(2049)],
			['wrong version', encode({ ...validCursor, version: 2 })],
			['wrong tab', encode({ ...validCursor, state: 'closed' })],
			['unknown source', encode({ ...validCursor, activeSources: ['unknown'] })],
			[
				'duplicate source',
				encode({ ...validCursor, activeSources: ['workflow_review', 'workflow_review'] }),
			],
			['overlapping source', encode({ ...validCursor, failedSources: ['workflow_review'] })],
			['empty source set', encode({ ...validCursor, activeSources: [] })],
			['missing anchor source', encode({ ...validCursor, activeSources: ['self_healing_result'] })],
			['empty anchor ID', encode({ ...validCursor, after: { ...validCursor.after, id: '' } })],
			[
				'invalid timestamp',
				encode({ ...validCursor, after: { ...validCursor.after, createdAt: 'yesterday' } }),
			],
		])('rejects %s before reading sources', async (_name, cursor) => {
			const source = createSource('workflow_review');
			registry.register(source);
			await expect(service.list(user, { state: 'open', limit: 15, cursor })).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(source.isEnabled).not.toHaveBeenCalled();
		});
	});

	describe('summary', () => {
		it('adds authorized counts without listing rows', async () => {
			const reviews = createSource('workflow_review', [review('r12', 12)]);
			const results = createSource('self_healing_result', [
				{ ...result('a11', 11), state: 'closed' },
			]);
			registry.register(reviews);
			registry.register(results);
			await expect(service.getSummary(user)).resolves.toEqual({
				counts: { open: 1, closed: 1 },
				partial: false,
				failedSources: [],
				disabledSources: [],
			});
			expect(reviews.count).toHaveBeenCalledWith(user);
			expect(results.count).toHaveBeenCalledWith(user);
			expect(reviews.list).not.toHaveBeenCalled();
		});

		it('makes counts unknown when one source fails', async () => {
			registry.register(createSource('workflow_review', [review('r12', 12)]));
			const results = createSource('self_healing_result');
			results.count.mockRejectedValue(new Error('Count failed'));
			registry.register(results);
			await expect(service.getSummary(user)).resolves.toMatchObject({
				counts: null,
				partial: true,
				failedSources: ['self_healing_result'],
			});
			await expect(service.list(user, { state: 'open', limit: 15 })).resolves.toMatchObject({
				partial: false,
			});
		});

		it('returns an error when every count fails', async () => {
			const source = createSource('workflow_review');
			source.count.mockRejectedValue(new Error('Count failed'));
			registry.register(source);
			await expect(service.getSummary(user)).rejects.toBeInstanceOf(ServiceUnavailableError);
		});
	});

	describe('settings', () => {
		it('keeps an available empty Inbox visible without reading rows or counts', async () => {
			const source = createSource('workflow_review');
			registry.register(source);
			await expect(service.getSettings()).resolves.toEqual({
				enabled: true,
				availableTypes: ['workflow_review'],
				failedTypes: [],
			});
			expect(source.list).not.toHaveBeenCalled();
			expect(source.count).not.toHaveBeenCalled();
		});

		it('reflects changes to an already registered source', async () => {
			const source = createSource('workflow_review');
			registry.register(source);
			source.isEnabled.mockResolvedValue(false);
			await expect(service.getSettings()).resolves.toEqual({
				enabled: false,
				availableTypes: [],
				failedTypes: [],
			});
			source.isEnabled.mockResolvedValue(true);
			await expect(service.getSettings()).resolves.toEqual({
				enabled: true,
				availableTypes: ['workflow_review'],
				failedTypes: [],
			});
		});

		it('keeps a retry path when availability is unknown', async () => {
			const source = createSource('workflow_review');
			source.isEnabled.mockRejectedValue(new Error('Availability failed'));
			registry.register(source);
			await expect(service.getSettings()).resolves.toEqual({
				enabled: true,
				availableTypes: [],
				failedTypes: ['workflow_review'],
			});
		});

		it('disables Inbox when no sources are registered', async () => {
			await expect(service.getSettings()).resolves.toEqual({
				enabled: false,
				availableTypes: [],
				failedTypes: [],
			});
			await expect(service.getSummary(user)).resolves.toMatchObject({
				counts: { open: 0, closed: 0 },
				partial: false,
			});
		});
	});
});
