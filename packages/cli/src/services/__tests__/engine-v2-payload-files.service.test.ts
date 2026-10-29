import type { Logger } from '@n8n/backend-common';
import type { BinaryDataService } from 'n8n-core';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionIdV2 } from '@/executions/execution-id';
import { EngineV2PayloadFiles } from '@/services/engine-v2-payload-files.service';

const EXECUTION_ID = '019606a1-0000-7000-8000-000000000001' as ExecutionIdV2;
const TEMP_FILE = 'workflows/wf-1/executions/temp/binary_data/abc';
const MOVED_FILE = `workflows/wf-1/executions/${EXECUTION_ID}/binary_data/abc`;

/** A file the control plane stored under the temporary execution path. */
const temporary = (fileId = TEMP_FILE): IBinaryData => ({
	id: `filesystem-v2:${fileId}`,
	data: '',
	mimeType: 'text/plain',
});

/** A file stored with the execution id already known, as a webhook node writes it. */
const settled = (): IBinaryData => ({
	id: `filesystem-v2:${MOVED_FILE}`,
	data: '',
	mimeType: 'text/plain',
});

/** A file that is on the item itself, so there is nothing in the store. */
const inMemory = (): IBinaryData => ({ data: 'aGk=', mimeType: 'text/plain' });

const payload = (...files: IBinaryData[]): INodeExecutionData[][] =>
	files.map((file) => [{ json: {}, binary: { data: file } }]);

describe('EngineV2PayloadFiles', () => {
	const binaryDataService = mock<BinaryDataService>();
	const logger = mock<Logger>();

	let payloadFiles: EngineV2PayloadFiles;

	beforeEach(() => {
		vi.clearAllMocks();
		binaryDataService.rename.mockResolvedValue(undefined);
		binaryDataService.deleteManyByBinaryDataId.mockResolvedValue(undefined);
		payloadFiles = new EngineV2PayloadFiles(binaryDataService, logger);
	});

	describe('claimForExecution', () => {
		it('moves a file referenced by two items once, and rewrites both references', async () => {
			const [first, second] = [temporary(), temporary()];

			await payloadFiles.claimForExecution(payload(first, second), EXECUTION_ID);

			expect(binaryDataService.rename).toHaveBeenCalledExactlyOnceWith(TEMP_FILE, MOVED_FILE);
			expect(first.id).toBe(`filesystem-v2:${MOVED_FILE}`);
			expect(second.id).toBe(`filesystem-v2:${MOVED_FILE}`);
		});

		it('leaves a file that is already under an execution path alone', async () => {
			const file = settled();

			await payloadFiles.claimForExecution(payload(file), EXECUTION_ID);

			expect(binaryDataService.rename).not.toHaveBeenCalled();
			expect(file.id).toBe(`filesystem-v2:${MOVED_FILE}`);
		});

		it.each([
			{ name: 'a file without an id', slots: payload(inMemory()) },
			{ name: 'a null slot', slots: [null] },
			{ name: 'an item without files', slots: [[{ json: {} }]] },
		])('skips $name', async ({ slots }) => {
			await payloadFiles.claimForExecution(slots, EXECUTION_ID);

			expect(binaryDataService.rename).not.toHaveBeenCalled();
		});

		it('rejects on a failed move only after every move ends, with each reference naming where its file is', async () => {
			const otherTempFile = 'workflows/wf-1/executions/temp/binary_data/def';
			const [moved, stuck] = [temporary(), temporary(otherTempFile)];
			// The move that succeeds ends after the one that fails, so a claim that
			// rejected at the first failure would leave `moved` naming the old path.
			binaryDataService.rename.mockImplementation(async (oldFileId) => {
				if (oldFileId === otherTempFile) throw new Error('disk gone');
				await new Promise((resolve) => setTimeout(resolve, 1));
			});

			await expect(
				payloadFiles.claimForExecution(payload(moved, stuck), EXECUTION_ID),
			).rejects.toThrow('disk gone');

			// The caller deletes by these references, so each must point at its file.
			expect(moved.id).toBe(`filesystem-v2:${MOVED_FILE}`);
			expect(stuck.id).toBe(`filesystem-v2:${otherTempFile}`);
		});
	});

	describe('discard', () => {
		it('deletes every stored file of the payload by id', async () => {
			await payloadFiles.discard(payload(temporary(), settled()));

			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledExactlyOnceWith([
				`filesystem-v2:${TEMP_FILE}`,
				`filesystem-v2:${MOVED_FILE}`,
			]);
		});

		it.each([
			{ name: 'no slots', slots: [] },
			{ name: 'a null slot', slots: [null] },
			{ name: 'an item without files', slots: [[{ json: {} }]] },
			{ name: 'a file without an id', slots: payload(inMemory()) },
		])('does not call the store for a payload with $name', async ({ slots }) => {
			await payloadFiles.discard(slots);

			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('logs a failed delete instead of throwing', async () => {
			const error = new Error('disk gone');
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValueOnce(error);

			await expect(payloadFiles.discard(payload(temporary()))).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to delete the files'),
				{ error },
			);
		});
	});
});
