import { executeTool, parseToolInput } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiSandboxFiles } from '../../../types';
import { createShareFilesTool } from '../share-files.tool';

const WORKSPACE_ROOT = '/home/user/workspace';

function setup(storeOutput: InstanceAiSandboxFiles['storeOutput']) {
	const context = { workspaceRoot: WORKSPACE_ROOT } as unknown as InstanceAiContext;
	const sandboxFiles: InstanceAiSandboxFiles = {
		maxImportBytes: 1024,
		importFiles: vi.fn(),
		storeOutput: vi.fn(storeOutput),
	};
	const tool = createShareFilesTool(context, sandboxFiles);
	const run = async (input: unknown) =>
		await executeTool<{
			files: Array<{ fileId: string; fileName: string }>;
			errors?: Array<{ path: string; error: string }>;
		}>(tool, input, {});
	return { tool, run, storeOutput: sandboxFiles.storeOutput };
}

const stored = async (path: string) =>
	await Promise.resolve({
		fileId: `id-${path}`,
		fileName: path,
		mimeType: 'text/csv',
		sizeBytes: 3,
	});

describe('createShareFilesTool', () => {
	it('stores each file and lists it under files, so the chat shows it', async () => {
		const { run } = setup(stored);

		const result = await run({ paths: ['report.csv'] });

		expect(result).toEqual({
			files: [
				{ fileId: 'id-report.csv', fileName: 'report.csv', mimeType: 'text/csv', sizeBytes: 3 },
			],
		});
	});

	it.each([
		['a path relative to outputs/', 'charts/sales.png'],
		['a path that starts with outputs/', 'outputs/charts/sales.png'],
		['an absolute path under the root', `${WORKSPACE_ROOT}/outputs/charts/sales.png`],
	])('accepts %s', async (_label, path) => {
		const { run, storeOutput } = setup(stored);

		await run({ paths: [path] });

		expect(storeOutput).toHaveBeenCalledWith('charts/sales.png', undefined);
	});

	it('stores a path that is given twice once', async () => {
		const { run, storeOutput } = setup(stored);

		const result = await run({ paths: ['a.csv', 'outputs/a.csv'] });

		expect(storeOutput).toHaveBeenCalledTimes(1);
		expect(result.files).toHaveLength(1);
	});

	it('shares the other files when one fails, and lists the failure', async () => {
		const { run } = setup(async (path) => {
			if (path === 'missing.csv') throw new Error('"missing.csv" is not a file in outputs/');
			return await stored(path);
		});

		const result = await run({ paths: ['missing.csv', 'b.csv'] });

		expect(result.files.map((file) => file.fileId)).toEqual(['id-b.csv']);
		expect(result.errors).toEqual([
			{ path: 'missing.csv', error: '"missing.csv" is not a file in outputs/' },
		]);
	});

	it('reports a path that leaves the workspace without storing it', async () => {
		const { run, storeOutput } = setup(stored);

		const result = await run({ paths: ['../../etc/passwd'] });

		expect(storeOutput).not.toHaveBeenCalled();
		expect(result.errors?.[0].error).toContain('must stay within the workspace root');
	});

	it('passes the abort signal of the call to the host', async () => {
		const { tool, storeOutput } = setup(stored);
		const abortSignal = new AbortController().signal;

		await executeTool(tool, { paths: ['a.csv'] }, { abortSignal });

		expect(storeOutput).toHaveBeenCalledWith('a.csv', abortSignal);
	});

	it('rethrows an abort', async () => {
		const abort = new DOMException('Aborted', 'AbortError');
		const { run } = setup(async () => await Promise.reject(abort));

		await expect(run({ paths: ['a.csv'] })).rejects.toBe(abort);
	});

	it('rejects an empty path list', () => {
		const { tool } = setup(stored);

		expect(parseToolInput(tool, { paths: [] }).success).toBe(false);
	});
});
