import { mock } from 'vitest-mock-extended';

import type { CliArgs } from '../cli/args';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { resolveEvalBuildMode, resolveEvalPromptSettings } from '../harness/build-mode';
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
	beforeEach(() => vi.stubEnv('N8N_EVAL_PROMPT_VERSION', undefined));
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

	it('pins a case version before suite settings and mode', () => {
		vi.stubEnv('N8N_EVAL_BUILD_MODE', 'invalid');
		vi.stubEnv('N8N_EVAL_PROMPT_VERSION', 'default@1');
		expect(
			resolveEvalPromptSettings({ promptVersion: 'progressive@1', buildMode: 'default' }),
		).toEqual({
			promptVersion: 'progressive@1',
			buildMode: 'progressive',
		});
	});

	it('uses suite versions only for cases without explicit overrides', () => {
		vi.stubEnv('N8N_EVAL_PROMPT_VERSION', 'progressive@1');
		expect(resolveEvalPromptSettings({}).promptVersion).toBe('progressive@1');
		expect(resolveEvalPromptSettings({ buildMode: 'default' })).toEqual({
			buildMode: 'default',
			promptVersion: undefined,
		});
	});

	it('rejects an unavailable pinned version before running cases', () => {
		const pinned = entry();
		pinned.testCase.promptVersion = 'missing@1';
		expect(() => selectCases(args, [pinned], logger)).toThrow('Unknown Instance AI prompt version');
	});
});
