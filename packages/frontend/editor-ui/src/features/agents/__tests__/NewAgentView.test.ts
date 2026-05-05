import { describe, expect, it } from 'vitest';

import source from '../views/NewAgentView.vue?raw';

describe('NewAgentView', () => {
	it('tells the builder to attach generated skill refs through config patching', () => {
		expect(source).not.toContain('then register the returned id in the agent config skills array');
		expect(source).toContain(
			'For each skill, call create_skill with the name, description, and body.',
		);
		expect(source).toContain(
			'After creating the skills, call read_config and patch_config to append the returned skill refs to the config skills array.',
		);
	});
});
