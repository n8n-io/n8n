import { mock } from 'vitest-mock-extended';

import type { CliArgs } from '../cli/args';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { selectCases } from '../run/case-selection';

const entry = (fileSlug: string, requiresMemoryCompaction?: boolean): WorkflowTestCaseWithFile => ({
	fileSlug,
	testCase: {
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
		conversation: [{ role: 'user', text: 'Build a workflow' }],
		...(requiresMemoryCompaction !== undefined ? { requiresMemoryCompaction } : {}),
	},
});

function setup(assistantRuntime: CliArgs['assistantRuntime']) {
	const args = mock<CliArgs>({
		buildViaMcp: false,
		prebuiltWorkflows: undefined,
		assistantRuntime,
	});
	const logger = mock<EvalLogger>();
	return { args, logger };
}

describe('selectCases on the Assistant agent', () => {
	beforeEach(() => {
		vi.stubEnv('N8N_EVAL_PROMPT_VERSION', undefined);
	});
	afterEach(() => vi.unstubAllEnvs());

	it('skips the cases that need memory compaction and names them', () => {
		const { args, logger } = setup('agents');

		const { testCasesWithFiles } = selectCases(
			args,
			[entry('plain'), entry('compaction-a', true), entry('compaction-b', true)],
			logger,
		);

		expect(testCasesWithFiles.map(({ fileSlug }) => fileSlug)).toEqual(['plain']);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/skipping 2 .*no observer threshold override.*compaction-a, compaction-b/,
			),
		);
	});

	it('throws when every selected case needs memory compaction', () => {
		const { args, logger } = setup('agents');

		expect(() => selectCases(args, [entry('compaction-a', true)], logger)).toThrow(
			/--assistant-runtime agents supports none of the selected test cases/,
		);
	});

	it('keeps the compaction cases on the Instance AI runtime', () => {
		const { args, logger } = setup('instance-ai');

		const { testCasesWithFiles } = selectCases(
			args,
			[entry('plain'), entry('compaction-a', true)],
			logger,
		);

		expect(testCasesWithFiles).toHaveLength(2);
		expect(logger.warn).not.toHaveBeenCalled();
	});
});

describe('selectCases with Agent run fields', () => {
	const directEntry = (
		fileSlug: string,
		agentRun: Record<string, unknown>,
		scenario: Record<string, unknown> = {},
	): WorkflowTestCaseWithFile => ({
		fileSlug,
		testCase: {
			complexity: 'simple',
			tags: [],
			datasets: ['full'],
			agentRun: { mode: 'direct', ...agentRun },
			executionScenarios: [
				{ name: 's', description: 'd', dataSetup: 'x', successCriteria: 'y', ...scenario },
			],
		},
	});

	it('keeps memory and multi-turn cases without a warning: every field is acted on', () => {
		const { args, logger } = setup('instance-ai');

		const { testCasesWithFiles } = selectCases(
			args,
			[
				directEntry('memory', { keepMemory: true, configOverrides: { memory: {} } }),
				directEntry('multi-turn', {}, { userTurns: { goal: 'g', maxTurns: 6 } }),
				directEntry('sessions', {}, { sessions: [{ goal: 'g', maxTurns: 6 }] }),
				directEntry('plain', {}),
			],
			logger,
		);

		expect(testCasesWithFiles).toHaveLength(4);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('does not warn when keepMemory is false', () => {
		const { args, logger } = setup('instance-ai');

		selectCases(args, [directEntry('memory-off', { keepMemory: false })], logger);

		expect(logger.warn).not.toHaveBeenCalled();
	});
});
