import type { InboxItem, InboxSourceType, InboxWorkflowReviewItem } from '@n8n/api-types';
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
						(difference === 0 && boundary.mode === 'afterItem' && item.id > boundary.id)
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

	it('pages through a source without skipping prefetched rows', async () => {
		const reviews = createSource('workflow_review', [
			review('r12', 12),
			review('r11', 11),
			review('r10', 10),
			review('r9', 9),
			review('r8', 8),
			review('r7', 7),
		]);
		registry.register(reviews);

		const first = await service.list(user, { state: 'open', limit: 2 });
		const second = await service.list(user, { state: 'open', limit: 2, cursor: first.nextCursor! });
		const third = await service.list(user, { state: 'open', limit: 2, cursor: second.nextCursor! });

		expect(first.data.map(({ id }) => id)).toEqual(['r12', 'r11']);
		expect(second.data.map(({ id }) => id)).toEqual(['r10', 'r9']);
		expect(third.data.map(({ id }) => id)).toEqual(['r8', 'r7']);
		expect(third).toMatchObject({ hasMore: false, nextCursor: null, partial: false });
		expect(reviews.list).toHaveBeenNthCalledWith(2, user, {
			state: 'open',
			limit: 3,
			boundary: { mode: 'afterItem', createdAt: new Date(timestamp(11)), id: 'r11' },
		});
		expect(reviews.count).not.toHaveBeenCalled();
	});

	it.each(['waiting', 'authored'] as const)(
		'passes the %s category to Closed source reads',
		async (category) => {
			const source = createSource('workflow_review');
			registry.register(source);
			await service.list(user, { state: 'closed', category, limit: 15 });
			expect(source.list).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ state: 'closed', category }),
			);
		},
	);

	it('rejects cursors used with another category', async () => {
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

	it.each([1, 3])(
		'continues tied timestamps within the cursor source with page size %s',
		async (limit) => {
			registry.register(createSource('workflow_review', [review('1', 12), review('2', 12)]));
			const keys: string[] = [];
			let cursor: string | undefined;
			do {
				const page = await service.list(user, { state: 'open', limit, cursor });
				keys.push(...page.data.map(({ type, id }) => `${type}:${id}`));
				cursor = page.nextCursor ?? undefined;
			} while (cursor);
			expect(keys).toEqual(['workflow_review:1', 'workflow_review:2']);
		},
	);

	it('preserves the source database order when IDs use a different collation', async () => {
		registry.register(createSource('workflow_review', [review('a', 12), review('B', 12)]));
		const page = await service.list(user, { state: 'open', limit: 3 });
		expect(page.data.map(({ type, id }) => `${type}:${id}`)).toEqual([
			'workflow_review:a',
			'workflow_review:B',
		]);
	});

	it('continues after the anchor row is deleted', async () => {
		const rows = [review('r12', 12), review('r10', 10), review('r8', 8)];
		registry.register(createSource('workflow_review', rows));
		const first = await service.list(user, { state: 'open', limit: 1 });
		rows.shift();
		const next = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		expect(next.data.map(({ id }) => id)).toEqual(['r10']);
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

	it('returns a retryable error with source metadata when all reads fail', async () => {
		for (const type of ['workflow_review'] as const) {
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
				failedSources: ['workflow_review'],
				disabledSources: [],
			},
		});
		expect(logger.warn).toHaveBeenCalledTimes(1);
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
		registry.register(reviews);
		const first = await service.list(user, { state: 'open', limit: 1 });
		reviews.isEnabled.mockResolvedValue(false);
		const second = await service.list(user, { state: 'open', limit: 1, cursor: first.nextCursor! });
		expect(second.data.map(({ id }) => id)).toEqual([]);
		expect(second.disabledSources).toEqual(['workflow_review']);
		expect(reviews.list).toHaveBeenCalledTimes(1);
	});

	it('treats a recognized source absent after restart as disabled', async () => {
		const cursor = encode({
			version: 1,
			state: 'open',
			after: { type: 'workflow_review', id: 'r11', createdAt: timestamp(11) },
			activeSources: ['workflow_review'],
			failedSources: [],
		});
		const page = await service.list(user, { state: 'open', limit: 15, cursor });
		expect(page.data.map(({ id }) => id)).toEqual([]);
		expect(page.disabledSources).toEqual(['workflow_review']);
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
			const reviews = createSource('workflow_review', [
				review('r12', 12),
				{ ...review('r11', 11), state: 'closed' },
			]);
			registry.register(reviews);
			await expect(service.getSummary(user)).resolves.toEqual({
				counts: { open: 1, closed: 1 },
				partial: false,
				failedSources: [],
				disabledSources: [],
			});
			expect(reviews.count).toHaveBeenCalledWith(user);
			expect(reviews.list).not.toHaveBeenCalled();
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
