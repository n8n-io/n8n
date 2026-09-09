import { mock } from 'vitest-mock-extended';

import type { CliArgs } from '../cli/args';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { resolveEvalBuildMode } from '../harness/build-mode';
import type { EvalLogger } from '../harness/logger';
import { selectCases } from '../run/case-selection';

const args = mock<CliArgs>({ buildViaMcp: false, prebuiltWorkflows: undefined });
const logger = mock<EvalLogger>();
const entry = (buildMode?: 'progressive' | 'default'): WorkflowTestCaseWithFile => ({
	fileSlug: 'test-case',
	testCase: {
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		buildMode,
		conversation: [{ role: 'user', text: 'Build a workflow' }],
	},
});

describe('eval build mode', () => {
	afterEach(() => vi.unstubAllEnvs());
	it('uses control unless the suite explicitly selects progressive', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', '');
		expect(resolveEvalBuildMode(undefined)).toBe('default');
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progressive');
		expect(resolveEvalBuildMode(undefined)).toBe('progressive');
	});
	it('preserves case overrides in both suite modes', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progressive');
		expect(resolveEvalBuildMode('default')).toBe('default');
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'default');
		expect(resolveEvalBuildMode('progressive')).toBe('progressive');
	});

	it.each([undefined, '', ' ', 'default', ' default '])('uses control for %s', (value) => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', value);
		expect(resolveEvalBuildMode(undefined)).toBe('default');
	});

	it('rejects an invalid environment mode when a selected case needs it', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progresssive');
		expect(() => selectCases(args, [entry()], logger)).toThrow('N8N_EVAL_BUILD_MODE');
	});

	it('preserves explicit case overrides when the environment value is invalid', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progresssive');
		expect(resolveEvalBuildMode('default')).toBe('default');
		expect(resolveEvalBuildMode('progressive')).toBe('progressive');
		expect(
			selectCases(args, [entry('default'), entry('progressive')], logger).testCasesWithFiles,
		).toHaveLength(2);
	});

	it('ignores the orchestrator mode for MCP builds', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'progresssive');
		expect(
			selectCases({ ...args, buildViaMcp: true }, [entry()], logger).testCasesWithFiles,
		).toHaveLength(1);
	});
});
