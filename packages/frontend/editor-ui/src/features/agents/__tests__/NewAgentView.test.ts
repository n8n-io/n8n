import { describe, expect, it } from 'vitest';

import source from '../views/NewAgentView.vue?raw';

describe('NewAgentView', () => {
	it('does not tell the builder to register skill refs after create_skill', () => {
		expect(source).not.toContain('then register the returned id in the agent config skills array');
		expect(source).toContain(
			'For each skill, call create_skill with the name, description, and body.',
		);
	});
});
