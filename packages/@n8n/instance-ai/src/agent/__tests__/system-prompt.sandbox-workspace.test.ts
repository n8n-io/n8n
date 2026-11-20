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

	it('tells the model to read files in the workspace, because the turn has no parse-file', () => {
		const withImport = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileImportEnabled: true,
		});

		expect(withImport).toContain('Then read it with commands or scripts in the workspace.');
		expect(withImport).not.toContain('parse-file');
	});

	it('names share-files and outputs/ only when the tool is wired', () => {
		const without = getSystemPrompt({ workspaceRoot: '/home/user/workspace' });
		const withSharing = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileSharingEnabled: true,
		});

		expect(without).not.toContain('share-files');
		expect(withSharing).toContain('call `share-files` with its path');
		expect(withSharing).toContain('Keep scratch files out of `outputs/`');
	});

	it('tells the model to import a file again when the workspace was reset', () => {
		const withImport = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileImportEnabled: true,
		});

		expect(withImport).toContain('The workspace can be reset between turns.');
		expect(withImport).toContain('import it again when it is missing');
	});

	it('names list-files only when the tool is wired', () => {
		const without = getSystemPrompt({ workspaceRoot: '/home/user/workspace' });
		const withListing = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileListingEnabled: true,
		});

		expect(without).not.toContain('list-files');
		expect(withListing).toContain('call `list-files`');
	});

	it('tells the model to view the images it makes only when view-file is wired', () => {
		const without = getSystemPrompt({ workspaceRoot: '/home/user/workspace' });
		const withViewing = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fileViewingEnabled: true,
		});

		expect(without).not.toContain('view-file');
		expect(withViewing).toContain('call `view-file` with the fileId that `share-files` returns');
	});

	it('leaves out the import guidance without a workspace', () => {
		expect(getSystemPrompt({ fileImportEnabled: true })).not.toContain('import-files');
	});
});
