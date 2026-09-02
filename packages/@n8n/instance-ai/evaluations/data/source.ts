// Test-case source selector — `disk` (default) or `langtracer`, both returning the
// same WorkflowTestCaseWithFile[] so the rest of the pipeline is source-agnostic.

import { loadAgentEvalTestCasesWithFiles } from './agents';
import { loadWorkflowTestCasesWithFiles, type WorkflowTestCaseWithFile } from './workflows';
import type { CliArgs } from '../cli/args';
import type { EvalLogger } from '../harness/logger';
import { loadTestCasesFromLangTracer } from '../langtracer/provider';

export async function loadTestCases(
	args: CliArgs,
	logger: EvalLogger,
): Promise<WorkflowTestCaseWithFile[]> {
	if (args.source === 'langtracer') {
		if (!args.suite) throw new Error('--source langtracer requires --suite <slug>');
		return await loadTestCasesFromLangTracer({
			suite: args.suite,
			filter: args.filter,
			exclude: args.exclude,
			tier: args.tier,
			logger,
		});
	}

	const cases = [
		...loadWorkflowTestCasesWithFiles(args.filter, args.exclude),
		...loadAgentEvalTestCasesWithFiles(args.filter, args.exclude),
	];
	const { tier } = args;
	if (!tier) return cases;

	const matched = cases.filter(({ testCase }) => testCase.datasets.includes(tier));
	if (matched.length === 0) {
		const known = [...new Set(cases.flatMap(({ testCase }) => testCase.datasets))].sort();
		throw new Error(
			`No test cases match --tier "${tier}". Known tiers: ${known.join(', ') || '(none)'}.`,
		);
	}
	return matched;
}
