import { mock } from 'vitest-mock-extended';

import type { CliArgs } from '../cli/args';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { resolveEvalPromptVersion } from '../harness/prompt-version';
import { selectCases } from '../run/case-selection';

const args = mock<CliArgs>({ buildViaMcp: false, prebuiltWorkflows: undefined });
const logger = mock<EvalLogger>();
const entry = (): WorkflowTestCaseWithFile => ({
	fileSlug: 'test-case',
	testCase: {
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		conversation: [{ role: 'user', text: 'Build a workflow' }],
	},
});

describe('eval prompt version', () => {
	beforeEach(() => vi.stubEnv('N8N_EVAL_PROMPT_VERSION', undefined));
	afterEach(() => vi.unstubAllEnvs());

	it('leaves the version to the backend when nothing is pinned', () => {
		expect(resolveEvalPromptVersion({})).toBeUndefined();
	});

	it('pins a case version before the suite version', () => {
		vi.stubEnv('N8N_EVAL_PROMPT_VERSION', 'default@1');
		expect(resolveEvalPromptVersion({ promptVersion: 'concise@1' })).toBe('concise@1');
		expect(resolveEvalPromptVersion({})).toBe('default@1');
	});

	it('skips prompt validation for MCP builds', () => {
		vi.stubEnv('N8N_EVAL_PROMPT_VERSION', 'missing@1');
		expect(
			selectCases({ ...args, buildViaMcp: true }, [entry()], logger).testCasesWithFiles,
		).toHaveLength(1);
	});

	it('rejects an unavailable pinned version before running cases', () => {
		const pinned = entry();
		pinned.testCase.promptVersion = 'missing@1';
		expect(() => selectCases(args, [pinned], logger)).toThrow('Unknown Instance AI prompt version');
	});
});
