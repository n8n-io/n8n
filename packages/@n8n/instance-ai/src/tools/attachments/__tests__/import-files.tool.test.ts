import { executeTool, parseToolInput } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiStoredFile } from '../../../types';
import { createImportFilesTool } from '../import-files.tool';

const WORKSPACE_ROOT = '/home/user/workspace';
const MAX_BYTES = 200 * 1024 * 1024;

function storedFile(fileName: string): InstanceAiStoredFile {
	return {
		fileName,
		mimeType: 'text/csv',
		sizeBytes: 3,
		hasContent: vi.fn(async () => await Promise.resolve(true)),
		readContent: vi.fn(async () => await Promise.resolve(Buffer.from('a,b'))),
	};
}

function setup(files: Record<string, InstanceAiStoredFile>) {
	const context = {
		workspaceRoot: WORKSPACE_ROOT,
		logger: { debug: vi.fn(), warn: vi.fn() },
	} as unknown as InstanceAiContext;
	const reader = { read: vi.fn(async (fileId: string) => await Promise.resolve(files[fileId])) };
	// The host copies the files and gives paths relative to the workspace root.
	const importFiles = vi.fn(
		async (byPath: Record<string, string>) =>
			await Promise.resolve(
				Object.entries(byPath).map(([path, fileId]) => ({
					fileId,
					fileName: files[fileId].fileName,
					mimeType: files[fileId].mimeType,
					sizeBytes: files[fileId].sizeBytes,
					path: `inputs/${path}`,
				})),
			),
	);
	const tool = createImportFilesTool(context, reader, {
		maxImportBytes: MAX_BYTES,
		importFiles,
		storeOutput: vi.fn(),
	});
	const run = async (input: unknown) =>
		await executeTool<{
			imported: Array<{ fileId: string; path: string; sizeBytes: number }>;
			error?: string;
		}>(tool, input, {});
	return { tool, run, importFiles, reader, context };
}

describe('createImportFilesTool', () => {
	it('lets the host copy a file to inputs/ under its file name', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('sales.csv') });

		const result = await run({ files: [{ fileId: 'file-1' }] });

		expect(importFiles.mock.calls[0][0]).toEqual({ 'sales.csv': 'file-1' });
		// Not under `files`, so the chat does not show the upload again as a new file.
		expect(result).toEqual({
			imported: [
				{
					fileId: 'file-1',
					fileName: 'sales.csv',
					mimeType: 'text/csv',
					sizeBytes: 3,
					path: `${WORKSPACE_ROOT}/inputs/sales.csv`,
				},
			],
		});
	});

	it('reads only the metadata of the files', async () => {
		const file = storedFile('sales.csv');
		const { run } = setup({ 'file-1': file });

		await run({ files: [{ fileId: 'file-1' }] });

		expect(file.readContent).not.toHaveBeenCalled();
	});

	it.each([
		['a path relative to inputs/', 'q3/sales.csv', 'q3/sales.csv'],
		['a path that starts with inputs/', 'inputs/q3/sales.csv', 'q3/sales.csv'],
		['an absolute path under the root', `${WORKSPACE_ROOT}/q3/sales.csv`, 'q3/sales.csv'],
		['a folder path that ends with /', 'q3/', 'q3/sales.csv'],
		['a folder path under inputs/ that ends with /', 'inputs/q3/', 'q3/sales.csv'],
		['the inputs folder', 'inputs', 'sales.csv'],
		['the inputs folder with a slash', 'inputs/', 'sales.csv'],
		['an absolute folder path', `${WORKSPACE_ROOT}/inputs/q3/`, 'q3/sales.csv'],
	])('accepts %s', async (_label, path, expected) => {
		const { run, importFiles } = setup({ 'file-1': storedFile('sales.csv') });

		await run({ files: [{ fileId: 'file-1', path }] });

		expect(importFiles.mock.calls[0][0]).toEqual({ [expected]: 'file-1' });
	});

	it('uses the base name of a file name that has directories', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('reports/2026/sales.csv') });

		await run({ files: [{ fileId: 'file-1' }] });

		expect(importFiles.mock.calls[0][0]).toEqual({ 'sales.csv': 'file-1' });
	});

	it('keeps a file named inputs under its name', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('inputs') });

		await run({ files: [{ fileId: 'file-1' }] });

		expect(importFiles.mock.calls[0][0]).toEqual({ inputs: 'file-1' });
	});

	it('uses the fileId when the file name is not a usable path', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('..') });

		await run({ files: [{ fileId: 'file-1' }] });

		expect(importFiles.mock.calls[0][0]).toEqual({ 'file-1': 'file-1' });
	});

	it('copies nothing when one file is not in the conversation', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('a.csv') });

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'missing' }] });

		expect(result).toEqual({
			imported: [],
			error: 'File "missing" not found in this conversation',
		});
		expect(importFiles).not.toHaveBeenCalled();
	});

	it('hides a read error from the model and logs it', async () => {
		const { run, importFiles, reader, context } = setup({ 'file-1': storedFile('a.csv') });
		reader.read.mockRejectedValueOnce(new Error('QueryFailedError: connection to 10.0.0.3 lost'));

		const result = await run({ files: [{ fileId: 'file-1' }] });

		expect(result).toEqual({
			imported: [],
			error: 'File "file-1" could not be read. Nothing was copied.',
		});
		expect(context.logger.warn).toHaveBeenCalledWith(
			'Failed to read a stored file for import-files',
			{ fileId: 'file-1', error: 'QueryFailedError: connection to 10.0.0.3 lost' },
		);
		expect(importFiles).not.toHaveBeenCalled();
	});

	it('rethrows a read error when the call was cancelled', async () => {
		const { tool, reader } = setup({ 'file-1': storedFile('a.csv') });
		const controller = new AbortController();
		reader.read.mockImplementationOnce(async () => {
			controller.abort();
			throw new Error('read stopped');
		});

		await expect(
			executeTool(tool, { files: [{ fileId: 'file-1' }] }, { abortSignal: controller.signal }),
		).rejects.toThrow('read stopped');
	});

	it('copies nothing when a path leaves the workspace', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('a.csv') });

		const result = await run({ files: [{ fileId: 'file-1', path: '../../etc/passwd' }] });

		expect(result.error).toContain('must stay within the workspace root');
		expect(importFiles).not.toHaveBeenCalled();
	});

	it('copies nothing when two files go to the same path', async () => {
		const { run, importFiles } = setup({
			'file-1': storedFile('sales.csv'),
			'file-2': storedFile('sales.csv'),
		});

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'file-2' }] });

		expect(result.error).toBe('Two files go to "inputs/sales.csv". Give each file its own path.');
		expect(importFiles).not.toHaveBeenCalled();
	});

	it('gives the model the error of the host', async () => {
		const { run, importFiles } = setup({ 'file-1': storedFile('a.csv') });
		importFiles.mockRejectedValueOnce(
			new Error('One import copies up to 200 MB. Import fewer files at a time'),
		);

		const result = await run({ files: [{ fileId: 'file-1' }] });

		expect(result).toEqual({
			imported: [],
			error: 'One import copies up to 200 MB. Import fewer files at a time',
		});
	});

	it('gives the host the abort signal of the call, and rethrows when the call was cancelled', async () => {
		const { tool, importFiles } = setup({ 'file-1': storedFile('a.csv') });
		const controller = new AbortController();
		importFiles.mockImplementationOnce(async () => {
			controller.abort();
			throw new Error('write stopped');
		});

		await expect(
			executeTool(tool, { files: [{ fileId: 'file-1' }] }, { abortSignal: controller.signal }),
		).rejects.toThrow('write stopped');
		expect(importFiles).toHaveBeenCalledWith({ 'a.csv': 'file-1' }, controller.signal);
	});

	it('names the configured cap in its description', () => {
		const { tool } = setup({});

		expect(tool.description).toContain('up to 20 files and 200 MB');
	});

	it('rejects an empty file list', () => {
		const { tool } = setup({});

		expect(parseToolInput(tool, { files: [] }).success).toBe(false);
	});
});
