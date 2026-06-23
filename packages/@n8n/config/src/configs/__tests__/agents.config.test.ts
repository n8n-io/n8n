import { Container } from '@n8n/di';

import { AgentsConfig } from '../agents.config';

describe('AgentsConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('defaults modules to an empty list', () => {
		expect(Container.get(AgentsConfig).modules).toEqual([]);
	});

	it('rejects the retired node tools searcher module token', () => {
		const retiredModule = ['node', 'tools', 'searcher'].join('-');
		vi.stubEnv('N8N_AGENTS_MODULES', retiredModule);

		expect(() => Container.get(AgentsConfig)).toThrow(
			`Unknown agents module: "${retiredModule}". No agents modules are currently supported.`,
		);
	});
});
