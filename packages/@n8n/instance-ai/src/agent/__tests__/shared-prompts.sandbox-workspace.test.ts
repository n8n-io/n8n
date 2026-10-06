import { describe, expect, it } from 'vitest';

import { getSandboxWorkspaceSection } from '../shared-prompts';

describe('getSandboxWorkspaceSection', () => {
	it('includes the absolute output path when workspaceRoot and sessionId are set', () => {
		const section = getSandboxWorkspaceSection('/home/daytona/workspace', 'thread-1');
		expect(section).toContain('/home/daytona/workspace/outputs/thread-1');
		expect(section).toContain('Scratch Files');
	});

	it('omits output guidance when workspaceRoot is missing', () => {
		const section = getSandboxWorkspaceSection(undefined, 'thread-1');
		expect(section).not.toContain('outputs/');
		expect(section).not.toContain('Scratch Files');
	});
});
