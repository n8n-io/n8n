import { describe, expect, it } from 'vitest';

import { getSandboxWorkspaceSection } from '../shared-prompts';

describe('getSandboxWorkspaceSection', () => {
	it('includes upload and output env paths when workspaceRoot and sessionId are set', () => {
		const section = getSandboxWorkspaceSection('/home/daytona/workspace', 'thread-1');
		expect(section).toContain('$N8N_UPLOADS_DIR');
		expect(section).toContain('$N8N_OUTPUTS_DIR');
		expect(section).toContain('$N8N_UPLOADS_MANIFEST');
		expect(section).toContain('/home/daytona/workspace/uploads/thread-1');
		expect(section).toContain('/home/daytona/workspace/outputs/thread-1');
		expect(section).toContain('skipped');
		expect(section).toContain('Scratch Files');
		expect(section).toContain('workspace_run_javascript');
		expect(section).not.toContain('workspace_run_python');
	});

	it('omits output guidance when workspaceRoot is missing', () => {
		const section = getSandboxWorkspaceSection(undefined, 'thread-1');
		expect(section).not.toContain('outputs/');
		expect(section).not.toContain('uploads/');
		expect(section).not.toContain('Scratch Files');
		expect(section).not.toContain('workspace_run_javascript');
	});
});
