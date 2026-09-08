import { createStubWorkspace, stubWorkspaceRoot } from '../harness/stub-workspace';

describe('createStubWorkspace', () => {
	const filesystem = () => {
		const fs = createStubWorkspace().filesystem;
		if (!fs) throw new Error('stub workspace has no filesystem');
		return fs;
	};

	it('reads back what was written', async () => {
		const fs = filesystem();
		await fs.writeFile('src/workflows/a.workflow.ts', 'export default 1;');

		await expect(fs.readFile('src/workflows/a.workflow.ts')).resolves.toBe('export default 1;');
	});

	it.each([
		['an absolute path under the workspace root', `${stubWorkspaceRoot}/src/a.ts`],
		['a dot-relative path', './src/a.ts'],
	])('resolves %s to the same file', async (_label, path) => {
		const fs = filesystem();
		await fs.writeFile('src/a.ts', 'content');

		await expect(fs.readFile(path)).resolves.toBe('content');
	});

	it('rejects a read of a file that was never written', async () => {
		await expect(filesystem().readFile('missing.ts')).rejects.toThrow('No such file');
	});

	// The runtime offloads oversized tool results to `tool-results/runs/<hash>/`
	// and clears that directory at the end of every run, calling the filesystem
	// directly rather than through the exposed tools.
	describe('tool-result cleanup', () => {
		const runDirectory = 'tool-results/runs/run-hash';

		it('reports a directory as existing once a file sits under it', async () => {
			const fs = filesystem();
			await fs.writeFile(`${runDirectory}/call.result.json`, '{}');

			await expect(fs.exists(runDirectory)).resolves.toBe(true);
		});

		it('reports a directory that was never written as missing', async () => {
			await expect(filesystem().exists(runDirectory)).resolves.toBe(false);
		});

		it('removes every file under the directory it is given, and nothing else', async () => {
			const fs = filesystem();
			await fs.writeFile(`${runDirectory}/call.result.json`, '{}');
			await fs.writeFile('tool-results/runs/other-hash/call.result.json', '{}');

			await fs.rmdir(runDirectory);

			await expect(fs.exists(runDirectory)).resolves.toBe(false);
			await expect(fs.exists('tool-results/runs/other-hash')).resolves.toBe(true);
		});
	});

	it('offers only the tools production exposes', () => {
		expect(
			createStubWorkspace()
				.getTools()
				.map((tool) => tool.name),
		).not.toContain('workspace_file_stat');
	});
});
