// Test-case source selector — `disk` (default) or `langtracer`, both returning the
// same WorkflowTestCaseWithFile[] so the rest of the pipeline is source-agnostic.

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

	return loadWorkflowTestCasesWithFiles(args.filter, args.exclude, args.tier);
}
