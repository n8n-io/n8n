import { isAgentFeatureEnabled } from '../agent-feature-enabled';

const ORIGINAL_ENABLED_MODULES = process.env.N8N_ENABLED_MODULES;

describe('isAgentFeatureEnabled', () => {
	afterEach(() => {
		if (ORIGINAL_ENABLED_MODULES === undefined) {
			delete process.env.N8N_ENABLED_MODULES;
		} else {
			process.env.N8N_ENABLED_MODULES = ORIGINAL_ENABLED_MODULES;
		}
	});

	it('returns false when N8N_ENABLED_MODULES is unset', () => {
		delete process.env.N8N_ENABLED_MODULES;

		expect(isAgentFeatureEnabled()).toBe(false);
	});

	it('returns false when only other modules are enabled', () => {
		process.env.N8N_ENABLED_MODULES = 'instance-ai';

		expect(isAgentFeatureEnabled()).toBe(false);
	});

	it('returns true when agents is enabled', () => {
		process.env.N8N_ENABLED_MODULES = 'instance-ai,agents';

		expect(isAgentFeatureEnabled()).toBe(true);
	});

	it('ignores whitespace around enabled module names', () => {
		process.env.N8N_ENABLED_MODULES = ' instance-ai, agents ';

		expect(isAgentFeatureEnabled()).toBe(true);
	});
});
