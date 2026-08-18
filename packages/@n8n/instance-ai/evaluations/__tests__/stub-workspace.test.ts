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

	it('offers only the tools production exposes', () => {
		expect(
			createStubWorkspace()
				.getTools()
				.map((tool) => tool.name),
		).not.toContain('workspace_file_stat');
	});
});
