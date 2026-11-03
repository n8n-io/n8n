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
});
