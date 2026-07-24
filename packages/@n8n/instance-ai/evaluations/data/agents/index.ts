// ---------------------------------------------------------------------------
// Intent-resolution eval cases (`--tier agents`): user-voiced build requests
// asked plan-first and graded on the approach the assistant PROPOSES, via
// ordinary processExpectations. Builds are never exercised, and expectations
// name no build tools — the agent-build surface is being redesigned.
// README.md has the authoring contract. Requires the agents module.
// ---------------------------------------------------------------------------

import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
