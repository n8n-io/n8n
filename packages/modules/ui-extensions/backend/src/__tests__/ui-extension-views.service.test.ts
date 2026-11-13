import { UI_EXTENSION_MAX_VIEWS_PER_USER, type UiExtensionView } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
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
	let service: UiExtensionViewsService;

	const trxCtx = mock<OperationContext>();

	const view = (id: string): UiExtensionView => ({
		id,
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
		service = new UiExtensionViewsService(mock<Logger>(), settingsRepository, transactionRunner);
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
			['a value that is not a list of views', '[{"id":1}]'],
		])('returns no views for %s', async (_case, value) => {
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value }));

			await expect(service.list('user-1')).resolves.toEqual([]);
		});
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

		it('writes nothing when the transaction fails', async () => {
			transactionRunner.run.mockRejectedValue(new Error('db down'));

			await expect(service.upsert('user-1', { title: 'T', source: 'x' })).rejects.toThrow(
				'db down',
			);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});
	});
});
