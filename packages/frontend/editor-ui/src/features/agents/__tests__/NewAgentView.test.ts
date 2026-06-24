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

	it('tracks the description-prompt build as a build-mode submission', () => {
		// Without this event, the most interesting prompt of an agent's life
		// (the one that creates and configures it) goes unmeasured. The build
		// chat path already fires `User submitted message to agent`; this check
		// guards against the NewAgentView shortcut silently bypassing it.
		expect(source).toContain('agentTelemetry.trackSubmittedMessage');
		expect(source).toContain("mode: 'build'");
		expect(source).toContain("status: 'draft'");
	});
});
