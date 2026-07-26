import { getSandboxWorkspaceSection } from '../shared-prompts';

const WORKSPACE_ROOT = '/home/user/workspace';

describe('getSandboxWorkspaceSection', () => {
	it('anchors the skills and knowledge-base directories to the workspace root', () => {
		const section = getSandboxWorkspaceSection(WORKSPACE_ROOT);

		expect(section).toContain(`${WORKSPACE_ROOT}/skills/<skill-name>/`);
		expect(section).toContain(`${WORKSPACE_ROOT}/knowledge-base/`);
		expect(section).toContain('`index.json` catalog and `best-practices/`');
		expect(section).not.toContain('templates/');
		expect(section).not.toContain('knowledge-base/reference');
		expect(section).toContain(`${WORKSPACE_ROOT}/node-types/index.txt`);
	});

	it('warns that commands do not start in the workspace root', () => {
		const section = getSandboxWorkspaceSection(WORKSPACE_ROOT);

		expect(section).toContain('workspace_execute_command');
		expect(section).toContain(`cwd: "${WORKSPACE_ROOT}"`);
	});

	it('falls back to a placeholder root when none is known', () => {
		const section = getSandboxWorkspaceSection();

		expect(section).toContain('<workspace_root>/knowledge-base/');
	});
});
