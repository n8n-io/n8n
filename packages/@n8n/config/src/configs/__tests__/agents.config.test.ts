import { Container } from '@n8n/di';

import { AgentsConfig } from '../agents.config';

describe('AgentsConfig plan tools', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		Container.reset();
	});

	it.each([
		['', false],
		['false', false],
		['true', true],
	])('parses N8N_AGENTS_PLAN_TOOLS_ENABLED=%s as %s', (value, expected) => {
		vi.stubEnv('N8N_AGENTS_PLAN_TOOLS_ENABLED', value);
		Container.reset();
		expect(Container.get(AgentsConfig).planToolsEnabled).toBe(expected);
	});
});

describe('AgentsConfig human review', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		Container.reset();
	});
	it.each([
		['', false],
		['human-review', true],
	])('enables configured approvals with modules=%s', (modules, enabled) => {
		vi.stubEnv('N8N_AGENTS_MODULES', modules);
		Container.reset();
		expect(Container.get(AgentsConfig).humanReviewEnabled).toBe(enabled);
	});
});
