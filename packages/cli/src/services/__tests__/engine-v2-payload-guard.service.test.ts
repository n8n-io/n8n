import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EngineV2PayloadGuard } from '@/services/engine-v2-payload-guard.service';

const REASON = 'Engine 2.0 cannot receive files from a trigger yet.';

/** A file the control plane wrote to storage, so it has an id to delete. */
const stored = (id: string): IBinaryData => mock<IBinaryData>({ id, mimeType: 'text/plain' });

/** A file that rides on the item, so there is nothing to delete. */
const inMemory = (): IBinaryData =>
	mock<IBinaryData>({ id: undefined, data: 'aGk=', mimeType: 'text/plain' });

describe('EngineV2PayloadGuard', () => {
	const binaryDataService = mock<BinaryDataService>();
	const logger = mock<Logger>();

	let guard: EngineV2PayloadGuard;

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined);
		guard = new EngineV2PayloadGuard(binaryDataService, logger);
	});

	describe('assertNoFiles', () => {
		it.each([
			{ name: 'no slots', slots: [] },
			{ name: 'an empty slot', slots: [[]] },
			{ name: 'a null slot', slots: [null] },
			{ name: 'items with no binary key', slots: [[{ json: {} }]] },
			{ name: 'an empty binary map', slots: [[{ json: {}, binary: {} }]] },
		])('allows a payload with $name', async ({ slots }) => {
			await expect(guard.assertNoFiles(slots, REASON)).resolves.toBeUndefined();
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('refuses a stored file and deletes it, because no execution will own it', async () => {
			const slots = [[{ json: {}, binary: { attachment: stored('filesystem:abc') } }]];

			await expect(guard.assertNoFiles(slots, REASON)).rejects.toThrow(REASON);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
				'filesystem:abc',
			]);
		});

		it('deletes every stored file across slots and items', async () => {
			const slots: Array<INodeExecutionData[] | null> = [
				[
					{ json: {}, binary: { a: stored('filesystem:1') } },
					{ json: {}, binary: { b: stored('filesystem:2'), c: inMemory() } },
				],
				null,
				[{ json: {}, binary: { d: stored('filesystem:3') } }],
			];

			await expect(guard.assertNoFiles(slots, REASON)).rejects.toThrow(UserError);
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
				'filesystem:1',
				'filesystem:2',
				'filesystem:3',
			]);
		});

		it('refuses an in-memory file without a delete, as it has no id', async () => {
			const slots = [[{ json: {}, binary: { attachment: inMemory() } }]];

			await expect(guard.assertNoFiles(slots, REASON)).rejects.toThrow(REASON);
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('keeps the reason when the delete fails, and logs the leak', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValue(new Error('store is down'));
			const slots = [[{ json: {}, binary: { attachment: stored('s3:abc') } }]];

			await expect(guard.assertNoFiles(slots, REASON)).rejects.toThrow(REASON);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to delete the files of a rejected engine 2.0 payload',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});
	});

	describe('discardFiles', () => {
		it('deletes the stored files without refusing', async () => {
			const slots = [[{ json: {}, binary: { attachment: stored('filesystem:abc') } }]];

			await expect(guard.discardFiles(slots)).resolves.toBeUndefined();
			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
				'filesystem:abc',
			]);
		});

		it('does nothing for a payload with no files', async () => {
			await expect(guard.discardFiles([[{ json: {} }]])).resolves.toBeUndefined();
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('never throws when the delete fails, so the caller keeps its own answer', async () => {
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValue(new Error('store is down'));
			const slots = [[{ json: {}, binary: { attachment: stored('s3:abc') } }]];

			await expect(guard.discardFiles(slots)).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalled();
		});
	});
});
