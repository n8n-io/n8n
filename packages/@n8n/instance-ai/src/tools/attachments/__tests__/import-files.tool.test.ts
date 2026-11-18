import type { Workspace } from '@n8n/agents';

import { executeTool, parseToolInput } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiStoredFile } from '../../../types';
import { createImportFilesTool } from '../import-files.tool';

const WORKSPACE_ROOT = '/home/user/workspace';
const MAX_BYTES = 200 * 1024 * 1024;

function storedFile(
	fileName: string,
	content: string,
	overrides: Partial<InstanceAiStoredFile> = {},
): InstanceAiStoredFile {
	const bytes = Buffer.from(content);
	return {
		fileName,
		mimeType: 'text/csv',
		sizeBytes: bytes.byteLength,
		readContent: vi.fn(async () => await Promise.resolve(bytes)),
		...overrides,
	};
}

function setup(files: Record<string, InstanceAiStoredFile>) {
	const written = new Map<string, Buffer>();
	const writeFile = vi.fn(async (path: string, content: string | Buffer) => {
		written.set(path, Buffer.isBuffer(content) ? content : Buffer.from(content));
		await Promise.resolve();
	});
	const workspace = { filesystem: { writeFile } } as unknown as Workspace;
	const context = {
		workspaceRoot: WORKSPACE_ROOT,
		logger: { debug: vi.fn(), warn: vi.fn() },
	} as unknown as InstanceAiContext;
	const reader = { read: vi.fn(async (fileId: string) => await Promise.resolve(files[fileId])) };
	const tool = createImportFilesTool(context, reader, workspace, { maxBytes: MAX_BYTES });
	const run = async (input: unknown) =>
		await executeTool<{
			files: Array<{ fileId: string; path: string; sizeBytes: number }>;
			error?: string;
		}>(tool, input, {});
	return { tool, run, written, writeFile, reader };
}

describe('createImportFilesTool', () => {
	it('copies a file to inputs/ under its file name', async () => {
		const { run, written } = setup({ 'file-1': storedFile('sales.csv', 'a,b\n1,2') });

		const result = await run({ files: [{ fileId: 'file-1' }] });

		expect(written.get('inputs/sales.csv')?.toString()).toBe('a,b\n1,2');
		expect(result).toEqual({
			files: [
				{
					fileId: 'file-1',
					fileName: 'sales.csv',
					mimeType: 'text/csv',
					sizeBytes: 7,
					path: `${WORKSPACE_ROOT}/inputs/sales.csv`,
				},
			],
		});
	});

	it('keeps binary bytes as they are', async () => {
		const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);
		const { run, written } = setup({
			'file-1': {
				fileName: 'book.xlsx',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				sizeBytes: bytes.byteLength,
				readContent: async () => await Promise.resolve(bytes),
			},
		});

		await run({ files: [{ fileId: 'file-1' }] });

		expect(written.get('inputs/book.xlsx')).toEqual(bytes);
	});

	it.each([
		['a path relative to inputs/', 'q3/sales.csv', 'inputs/q3/sales.csv'],
		['a path that starts with inputs/', 'inputs/q3/sales.csv', 'inputs/q3/sales.csv'],
		['an absolute path under the root', `${WORKSPACE_ROOT}/q3/sales.csv`, 'inputs/q3/sales.csv'],
	])('accepts %s', async (_label, path, expected) => {
		const { run, written } = setup({ 'file-1': storedFile('sales.csv', 'x') });

		await run({ files: [{ fileId: 'file-1', path }] });

		expect([...written.keys()]).toEqual([expected]);
	});

	it('uses the base name of a file name that has directories', async () => {
		const { run, written } = setup({ 'file-1': storedFile('reports/2026/sales.csv', 'x') });

		await run({ files: [{ fileId: 'file-1' }] });

		expect([...written.keys()]).toEqual(['inputs/sales.csv']);
	});

	it('uses the fileId when the file name is not a usable path', async () => {
		const { run, written } = setup({ 'file-1': storedFile('..', 'x') });

		await run({ files: [{ fileId: 'file-1' }] });

		expect([...written.keys()]).toEqual(['inputs/file-1']);
	});

	it('copies nothing when one file is not in the conversation', async () => {
		const { run, writeFile } = setup({ 'file-1': storedFile('a.csv', 'x') });

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'missing' }] });

		expect(result).toEqual({ files: [], error: 'File "missing" not found in this conversation' });
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('copies nothing when a path leaves the workspace', async () => {
		const { run, writeFile } = setup({ 'file-1': storedFile('a.csv', 'x') });

		const result = await run({ files: [{ fileId: 'file-1', path: '../../etc/passwd' }] });

		expect(result.error).toContain('must stay within the workspace root');
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('copies nothing when two files go to the same path', async () => {
		const { run, writeFile } = setup({
			'file-1': storedFile('sales.csv', 'x'),
			'file-2': storedFile('sales.csv', 'y'),
		});

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'file-2' }] });

		expect(result.error).toContain('inputs/sales.csv');
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('copies nothing and loads no bytes when the files are over the size cap', async () => {
		const a = storedFile('a.csv', 'x', { sizeBytes: MAX_BYTES / 2 });
		const b = storedFile('b.csv', 'x', { sizeBytes: MAX_BYTES / 2 + 1 });
		const { run, writeFile } = setup({ 'file-1': a, 'file-2': b });

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'file-2' }] });

		expect(result.error).toBe('One call copies up to 200 MB. Import fewer files at a time.');
		expect(a.readContent).not.toHaveBeenCalled();
		expect(b.readContent).not.toHaveBeenCalled();
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('reports a file whose bytes storage no longer has, with the files copied before it', async () => {
		const { run } = setup({
			'file-1': storedFile('a.csv', 'x'),
			'file-2': storedFile('b.csv', 'y', {
				readContent: async () => await Promise.resolve(undefined),
			}),
		});

		const result = await run({ files: [{ fileId: 'file-1' }, { fileId: 'file-2' }] });

		expect(result.files.map((file) => file.fileId)).toEqual(['file-1']);
		expect(result.error).toBe('File "file-2" is no longer available');
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
