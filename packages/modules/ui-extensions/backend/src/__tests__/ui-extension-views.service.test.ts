import {
	UI_EXTENSION_MAX_PAGES_PER_USER,
	UI_EXTENSION_MAX_VIEWS_PER_USER,
	type UiExtensionView,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { OperationContext, Settings, SettingsRepository, TransactionRunner } from '@n8n/db';
import { UserError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	UiExtensionViewLimitError,
	UiExtensionViewNotFoundError,
	UiExtensionViewsService,
} from '../ui-extension-views.service';

describe('UiExtensionViewsService', () => {
	let settingsRepository: Mocked<SettingsRepository>;
	let transactionRunner: Mocked<TransactionRunner>;
	let eventService: Mocked<EventService>;
	let service: UiExtensionViewsService;

	const trxCtx = mock<OperationContext>();

	const view = (id: string, kind: UiExtensionView['kind'] = 'view'): UiExtensionView => ({
		id,
		kind,
		title: `View ${id}`,
		source: 'export default { template: "<p>hi</p>" }',
		updatedAt: '2026-01-01T00:00:00.000Z',
	});

	const storedViews = (views: UiExtensionView[]) =>
		mock<Settings>({ key: 'uiExtensions.views.user-1', value: JSON.stringify(views) });

	/** The views that the last write stored. */
	const writtenViews = (): UiExtensionView[] =>
		JSON.parse(settingsRepository.upsertByKey.mock.calls.at(-1)![1]) as UiExtensionView[];

	beforeEach(() => {
		settingsRepository = mock<SettingsRepository>();
		transactionRunner = mock<TransactionRunner>();
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(trxCtx));
		settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([]));
		eventService = mock<EventService>();
		service = new UiExtensionViewsService(
			mock<Logger>(),
			settingsRepository,
			transactionRunner,
			eventService,
		);
	});

	describe('list', () => {
		it('returns no views when nothing is stored', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await expect(service.list('user-1')).resolves.toEqual([]);
			expect(settingsRepository.findByKey).toHaveBeenCalledWith('uiExtensions.views.user-1');
		});

		it('returns the views stored for the user', async () => {
			settingsRepository.findByKey.mockResolvedValue(storedViews([view('a')]));

			await expect(service.list('user-1')).resolves.toEqual([view('a')]);
		});

		it('reads only the row of the given user', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.list('user-2');

			expect(settingsRepository.findByKey).toHaveBeenCalledWith('uiExtensions.views.user-2');
		});

		it.each([
			['malformed JSON', '{not json'],
			['a value that is not a list', '{"id":"a"}'],
		])('returns no views for %s', async (_case, value) => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value }));

			await expect(service.list('user-1')).resolves.toEqual([]);
		});
	});

	it('lists a stored record without a kind as a view', async () => {
		const { kind: _kind, ...legacy } = view('a');
		settingsRepository.findByKey.mockResolvedValue(
			mock<Settings>({ value: JSON.stringify([legacy, view('p', 'page')]) }),
		);

		await expect(service.list('user-1')).resolves.toEqual([view('a'), view('p', 'page')]);
	});

	it('skips a stored entry that is not a view and keeps the others', async () => {
		settingsRepository.findByKey.mockResolvedValue(
			mock<Settings>({ value: JSON.stringify([view('a'), { id: 1 }, view('b')]) }),
		);

		await expect(service.list('user-1')).resolves.toEqual([view('a'), view('b')]);
	});

	describe('upsert', () => {
		it('creates a view under a write lock in one transaction', async () => {
			const result = await service.upsert('user-1', {
				title: 'Stats',
				icon: 'chart-column',
				source: 'export default {}',
			});

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				'uiExtensions.views.user-1',
				'[]',
				false,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				'uiExtensions.views.user-1',
				expect.any(String),
				false,
				trxCtx,
			);
			expect(result.created).toBe(true);
			expect(result.view).toMatchObject({
				title: 'Stats',
				icon: 'chart-column',
				source: 'export default {}',
			});
			expect(result.view.id).toEqual(expect.any(String));
			expect(writtenViews()).toEqual([result.view]);
		});

		it('appends a new view to the existing ones', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));

			const { view: created } = await service.upsert('user-1', { title: 'B', source: 'x' });

			expect(writtenViews()).toEqual([view('a'), created]);
		});

		it('replaces the view with the given ID', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				storedViews([view('a'), view('b')]),
			);

			const result = await service.upsert('user-1', {
				viewId: 'b',
				title: 'New title',
				source: 'y',
			});

			expect(result.created).toBe(false);
			expect(result.view).toMatchObject({ id: 'b', title: 'New title', source: 'y' });
			expect(writtenViews()).toEqual([view('a'), result.view]);
		});

		it('rejects an ID that the user does not have', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));

			await expect(
				service.upsert('user-1', { viewId: 'other', title: 'T', source: 'x' }),
			).rejects.toThrow(UiExtensionViewNotFoundError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('rejects a new view past the limit', async () => {
			const full = Array.from({ length: UI_EXTENSION_MAX_VIEWS_PER_USER }, (_, i) =>
				view(String(i)),
			);
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews(full));

			const error = await service.upsert('user-1', { title: 'T', source: 'x' }).catch((e) => e);

			expect(error).toBeInstanceOf(UiExtensionViewLimitError);
			expect(error).toBeInstanceOf(UserError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('replaces a view when the user is at the limit', async () => {
			const full = Array.from({ length: UI_EXTENSION_MAX_VIEWS_PER_USER }, (_, i) =>
				view(String(i)),
			);
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews(full));

			const result = await service.upsert('user-1', { viewId: '3', title: 'T', source: 'x' });

			expect(result.created).toBe(false);
			expect(writtenViews()).toHaveLength(UI_EXTENSION_MAX_VIEWS_PER_USER);
		});

		it.each([
			['an empty title', { title: '  ', source: 'x' }],
			['a title that is too long', { title: 'x'.repeat(41), source: 'x' }],
			['an empty source', { title: 'T', source: '' }],
			['a source that is too long', { title: 'T', source: 'x'.repeat(100_001) }],
			['an icon that is not an icon name', { title: 'T', source: 'x', icon: 'a b<' }],
		])('rejects %s as a user error', async (_case, input) => {
			await expect(service.upsert('user-1', input)).rejects.toThrow(UserError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('rejects when the write fails, and returns no view', async () => {
			settingsRepository.upsertByKey.mockRejectedValue(new Error('db down'));

			await expect(service.upsert('user-1', { title: 'T', source: 'x' })).rejects.toThrow(
				'db down',
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledOnce();
		});

		it('keeps the existing views when it appends to a list with a broken entry', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				mock<Settings>({ value: JSON.stringify([view('a'), { id: 1 }]) }),
			);

			const { view: created } = await service.upsert('user-1', { title: 'B', source: 'x' });

			expect(writtenViews()).toEqual([view('a'), created]);
		});
	});

	describe('kinds', () => {
		it('creates a page with its kind', async () => {
			const result = await service.upsert('user-1', { kind: 'page', title: 'P', source: 'x' });

			expect(result.view.kind).toBe('page');
			expect(writtenViews()).toEqual([result.view]);
		});

		it('creates a view when no kind is given', async () => {
			const result = await service.upsert('user-1', { title: 'V', source: 'x' });

			expect(result.view.kind).toBe('view');
		});

		it('does not let a page replace a view, or a view replace a page', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				storedViews([view('v'), view('p', 'page')]),
			);

			await expect(
				service.upsert('user-1', { viewId: 'v', kind: 'page', title: 'T', source: 'x' }),
			).rejects.toThrow(UiExtensionViewNotFoundError);
			await expect(
				service.upsert('user-1', { viewId: 'p', kind: 'view', title: 'T', source: 'x' }),
			).rejects.toThrow(UiExtensionViewNotFoundError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('counts the page limit apart from the view limit', async () => {
			const views = Array.from({ length: UI_EXTENSION_MAX_VIEWS_PER_USER }, (_, i) =>
				view(`v${i}`),
			);
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews(views));

			const page = await service.upsert('user-1', { kind: 'page', title: 'P', source: 'x' });
			expect(page.created).toBe(true);
			await expect(service.upsert('user-1', { title: 'V', source: 'x' })).rejects.toThrow(
				UiExtensionViewLimitError,
			);
		});

		it('rejects a new page past the page limit', async () => {
			const pages = Array.from({ length: UI_EXTENSION_MAX_PAGES_PER_USER }, (_, i) =>
				view(`p${i}`, 'page'),
			);
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				storedViews([view('v'), ...pages]),
			);

			const error = await service
				.upsert('user-1', { kind: 'page', title: 'P', source: 'x' })
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UiExtensionViewLimitError);
			expect((error as Error).message).toContain('pageId');
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		it('removes the record under a write lock and keeps the others', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(
				storedViews([view('a'), view('p', 'page'), view('b')]),
			);

			await expect(service.remove('user-1', 'p')).resolves.toEqual(view('p', 'page'));

			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledExactlyOnceWith(
				'uiExtensions.views.user-1',
				'[]',
				false,
				trxCtx,
			);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				'uiExtensions.views.user-1',
				expect.any(String),
				false,
				trxCtx,
			);
			expect(writtenViews()).toEqual([view('a'), view('b')]);
		});

		it('throws for an ID that the user does not have, and writes nothing', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));

			await expect(service.remove('user-1', 'missing')).rejects.toThrow(
				UiExtensionViewNotFoundError,
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('does not remove a record of another user', async () => {
			// Only user A's row holds the record. User B's row is empty.
			settingsRepository.getOrCreateWithWriteLock.mockImplementation(async (key) =>
				key === 'uiExtensions.views.user-a'
					? storedViews([view('a-view')])
					: mock<Settings>({ key, value: '[]' }),
			);

			await expect(service.remove('user-b', 'a-view')).rejects.toThrow(
				UiExtensionViewNotFoundError,
			);
			expect(settingsRepository.getOrCreateWithWriteLock).toHaveBeenCalledWith(
				'uiExtensions.views.user-b',
				'[]',
				false,
				trxCtx,
			);
			expect(settingsRepository.getOrCreateWithWriteLock).not.toHaveBeenCalledWith(
				'uiExtensions.views.user-a',
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});

	describe('change event', () => {
		it('emits one event after a save', async () => {
			const { view: created } = await service.upsert('user-1', {
				kind: 'page',
				title: 'P',
				source: 'x',
			});

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('ui-extension-changed', {
				userId: 'user-1',
				extensionId: created.id,
				kind: 'page',
				change: 'saved',
			});
		});

		it('emits one event after a removal', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));

			await service.remove('user-1', 'a');

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('ui-extension-changed', {
				userId: 'user-1',
				extensionId: 'a',
				kind: 'view',
				change: 'removed',
			});
		});

		it('emits nothing when the write fails', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));
			settingsRepository.upsertByKey.mockRejectedValue(new Error('db down'));

			await expect(service.upsert('user-1', { title: 'T', source: 'x' })).rejects.toThrow();
			await expect(service.remove('user-1', 'a')).rejects.toThrow();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits nothing when the commit fails after the write', async () => {
			settingsRepository.getOrCreateWithWriteLock.mockResolvedValue(storedViews([view('a')]));
			// The work inside the transaction succeeds, and then the commit fails.
			transactionRunner.run.mockImplementation(async (_ctx, fn) => {
				await fn(trxCtx);
				throw new Error('commit failed');
			});

			await expect(service.upsert('user-1', { title: 'T', source: 'x' })).rejects.toThrow(
				'commit failed',
			);
			await expect(service.remove('user-1', 'a')).rejects.toThrow('commit failed');
			expect(settingsRepository.upsertByKey).toHaveBeenCalledTimes(2);
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits nothing when the input is not valid', async () => {
			await expect(service.upsert('user-1', { title: '', source: 'x' })).rejects.toThrow();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
