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

describe('InstanceAiConfig experience modes', () => {
	const MODES_ENABLED = 'N8N_EXPERIENCE_MODES_ENABLED';
	const DEFAULT_MODE = 'N8N_EXPERIENCE_DEFAULT_MODE';

	const loadConfig = () => Container.get(GlobalConfig).instanceAi;
	const silenceWarnings = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
		// The developer shell must not change the defaults under test.
		vi.stubEnv(MODES_ENABLED, undefined);
		vi.stubEnv(DEFAULT_MODE, undefined);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('keeps the modes off and uses simple when nothing is set', () => {
		const warn = silenceWarnings();

		const config = loadConfig();

		expect(config.experienceModesEnabled).toBe(false);
		expect(config.experienceDefaultMode).toBe('simple');
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining(MODES_ENABLED));
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining(DEFAULT_MODE));
	});

	it.each([
		['true', true],
		['TRUE', true],
		['1', true],
		['false', false],
		['0', false],
	])('reads %s as %s for the modes flag', (value, expected) => {
		vi.stubEnv(MODES_ENABLED, value);

		expect(loadConfig().experienceModesEnabled).toBe(expected);
	});

	it.each(['yes', 'on', 'enabled'])('warns and keeps the modes off for %s', (value) => {
		const warn = silenceWarnings();
		vi.stubEnv(MODES_ENABLED, value);

		expect(loadConfig().experienceModesEnabled).toBe(false);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining(MODES_ENABLED));
	});

	it.each(['simple', 'power'] as const)('accepts %s as the default mode', (mode) => {
		const warn = silenceWarnings();
		vi.stubEnv(DEFAULT_MODE, mode);

		expect(loadConfig().experienceDefaultMode).toBe(mode);
		expect(warn).not.toHaveBeenCalledWith(expect.stringContaining(DEFAULT_MODE));
	});

	// Compose env files and `echo value > file` often add whitespace or quotes.
	it.each([' power ', '"power"', "'power'", 'power\n'])(
		'removes whitespace and quotes from %j',
		(value) => {
			vi.stubEnv(DEFAULT_MODE, value);

			expect(loadConfig().experienceDefaultMode).toBe('power');
		},
	);

	// Startup must continue, so an unknown value falls back to the safe default.
	it.each(['builder', 'Power', 'POWER', '', 'simple,power'])(
		'warns and falls back to simple for %j',
		(value) => {
			const warn = silenceWarnings();
			vi.stubEnv(DEFAULT_MODE, value);

			expect(loadConfig().experienceDefaultMode).toBe('simple');
			expect(warn).toHaveBeenCalledWith(expect.stringContaining(DEFAULT_MODE));
		},
	);

	it('reads the flag and the default mode independently', () => {
		silenceWarnings();
		vi.stubEnv(MODES_ENABLED, 'true');
		vi.stubEnv(DEFAULT_MODE, 'builder');

		const config = loadConfig();

		expect(config.experienceModesEnabled).toBe(true);
		expect(config.experienceDefaultMode).toBe('simple');
	});
});
