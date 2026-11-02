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
		expect(prompt).not.toContain('does not exist');
	});

	it('names the fallback workspace root and asks for relative paths', () => {
		const prompt = getSystemPrompt({
			workspaceRoot: '/home/user/workspace',
			fallbackWorkspaceRoot: '/home/daytona/workspace',
		});

		expect(prompt).toContain(
			'If `/home/user/workspace` does not exist, the workspace root is `/home/daytona/workspace`.',
		);
		expect(prompt).toContain('Prefer relative paths');
	});
});
