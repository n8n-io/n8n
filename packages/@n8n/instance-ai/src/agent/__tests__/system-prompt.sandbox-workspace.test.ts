import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — sandbox workspace', () => {
	it('omits the section without a workspace root', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).not.toContain('## Sandbox workspace');
	});

	it('scopes the workspace to the workspace root', () => {
		const prompt = getSystemPrompt({ workspaceRoot: '/home/user/workspace' });

		expect(prompt).toContain('## Sandbox workspace');
		expect(prompt).toContain('Filesystem access is scoped to `/home/user/workspace`');
		expect(prompt).not.toContain('/home/daytona');
	});

	it('names import-files only when the tool is wired', () => {
		const without = getSystemPrompt({ workspaceRoot: '/home/user/workspace' });
		const withImport = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileImportEnabled: true,
		});

		expect(without).not.toContain('import-files');
		expect(withImport).toContain('copy it to `inputs/` with `import-files`');
	});

	it('leaves out the import guidance without a workspace', () => {
		expect(getSystemPrompt({ fileImportEnabled: true })).not.toContain('import-files');
	});
});
