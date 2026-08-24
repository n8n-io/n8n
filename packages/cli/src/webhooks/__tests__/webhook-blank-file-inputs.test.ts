import type formidable from 'formidable';
import { rm } from 'node:fs/promises';

import { discardBlankFileInputs } from '@/webhooks/webhook-blank-file-inputs';

vi.mock('node:fs/promises', () => ({ rm: vi.fn() }));

const file = (overrides: Partial<formidable.File> = {}) =>
	({
		filepath: '/tmp/upload',
		newFilename: 'upload',
		originalFilename: 'file.txt',
		mimetype: 'text/plain',
		size: 11,
		...overrides,
	}) as formidable.File;

/** What formidable reports for a file input the user left empty. */
const blankInput = (filepath: string) =>
	file({ filepath, originalFilename: '', mimetype: 'application/octet-stream', size: 0 });

/**
 * These cases assert what the parser-level tests in `webhook-form-data.test.ts`
 * cannot: that a discarded input's temp file is deleted, and where the boundary
 * between a blank input and a real upload sits. The shapes this function returns
 * are covered there, through real multipart requests.
 */
describe('discardBlankFileInputs', () => {
	const rmMock = vi.mocked(rm);

	beforeEach(() => {
		rmMock.mockReset();
		rmMock.mockResolvedValue(undefined);
	});

	it('should keep a filled input and delete nothing', async () => {
		const filled = file();

		const result = await discardBlankFileInputs({ document: [filled] });

		expect(result).toEqual({ document: [filled] });
		expect(rmMock).not.toHaveBeenCalled();
	});

	it('should discard a blank input and delete its temp file', async () => {
		const result = await discardBlankFileInputs({ document: [blankInput('/tmp/blank')] });

		expect(result).toEqual({});
		expect(rmMock).toHaveBeenCalledExactlyOnceWith('/tmp/blank', { force: true });
	});

	it('should drop a repeated field whose every entry is blank', async () => {
		const result = await discardBlankFileInputs({
			attachments: [blankInput('/tmp/blank1'), blankInput('/tmp/blank2')],
		});

		expect(result).toEqual({});
		expect(rmMock).toHaveBeenCalledTimes(2);
		expect(rmMock).toHaveBeenCalledWith('/tmp/blank1', { force: true });
		expect(rmMock).toHaveBeenCalledWith('/tmp/blank2', { force: true });
	});

	it('should still return the filled inputs when a deletion fails', async () => {
		const filled = file();
		rmMock.mockRejectedValueOnce(new Error('EACCES'));

		const result = await discardBlankFileInputs({
			document: [filled],
			blank: [blankInput('/tmp/blank')],
		});

		// A failed cleanup must not turn a parsed request into an error.
		expect(result).toEqual({ document: [filled] });
	});

	it('should ignore a field named __proto__ instead of throwing', async () => {
		// formidable reassigns the map's prototype for such a part rather than
		// adding an own key, so the entry is not reachable as a key at all.
		const files: Record<string, formidable.File[] | undefined> = {};
		Object.setPrototypeOf(files, [file()]);

		const result = await discardBlankFileInputs(files);

		expect(result).toEqual({});
		expect(rmMock).not.toHaveBeenCalled();
	});

	it('should keep a file that holds no bytes but has a name', async () => {
		// The user selected an empty file, which is a submission, not a blank input.
		const selected = file({ originalFilename: 'empty.txt', size: 0 });

		const result = await discardBlankFileInputs({ document: [selected] });

		expect(result).toEqual({ document: [selected] });
		expect(rmMock).not.toHaveBeenCalled();
	});

	it('should keep a file that omits the filename', async () => {
		// Non-browser clients upload real content without naming the part.
		const unnamed = file({ originalFilename: null });

		const result = await discardBlankFileInputs({ document: [unnamed] });

		expect(result).toEqual({ document: [unnamed] });
		expect(rmMock).not.toHaveBeenCalled();
	});
});
