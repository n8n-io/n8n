import { resolveEvalBuildMode } from '../harness/build-workflow';

describe('eval build mode', () => {
	afterEach(() => vi.unstubAllEnvs());
	it('uses control unless the suite explicitly selects progressive', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', '');
		expect(resolveEvalBuildMode(undefined)).toBeUndefined();
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progressive');
		expect(resolveEvalBuildMode(undefined)).toBe('progressive');
	});
	it('preserves case overrides in both suite modes', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progressive');
		expect(resolveEvalBuildMode('default')).toBeUndefined();
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'default');
		expect(resolveEvalBuildMode('progressive')).toBe('progressive');
	});
});
