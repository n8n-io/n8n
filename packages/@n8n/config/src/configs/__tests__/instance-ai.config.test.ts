import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('InstanceAiConfig concurrency caps', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('defaults to unlimited so the feature is off until opted into', () => {
		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.maxConcurrentRuns).toBe(-1);
		expect(instanceAi.maxConcurrentRunsPerUser).toBe(-1);
		expect(instanceAi.maxConcurrentSubAgents).toBe(-1);
	});

	it('accepts a positive override', () => {
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', '20');

		expect(Container.get(GlobalConfig).instanceAi.maxConcurrentRuns).toBe(20);
	});

	it('accepts -1 for unlimited', () => {
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', '-1');
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS_PER_USER', '-1');
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_SUB_AGENTS', '-1');

		const { instanceAi } = Container.get(GlobalConfig);

		expect(instanceAi.maxConcurrentRuns).toBe(-1);
		expect(instanceAi.maxConcurrentRunsPerUser).toBe(-1);
		expect(instanceAi.maxConcurrentSubAgents).toBe(-1);
	});

	// `0` would be ambiguous — "block everything" or "no cap" — so it is rejected rather
	// than guessed at. An invalid value falls back to the default, which is unlimited.
	it.each(['0', '-5', '2.5', 'unlimited'])('rejects %s and falls back to the default', (value) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS', value);

		expect(Container.get(GlobalConfig).instanceAi.maxConcurrentRuns).toBe(-1);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('N8N_INSTANCE_AI_MAX_CONCURRENT_RUNS'),
		);
	});
});
