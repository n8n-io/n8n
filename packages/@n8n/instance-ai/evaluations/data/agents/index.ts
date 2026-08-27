// ---------------------------------------------------------------------------
// Authoring dir for intent-resolution eval cases (`--tier agents`): user-voiced
// build requests asked plan-first and graded on the approach the assistant
// PROPOSES, via ordinary processExpectations. Builds are never exercised, and
// expectations name no build tools — the agent-build surface is being
// redesigned. The corpus lives in the LangTracer `agents` suite (pushed via
// eval:langtracer-push); author a case here, calibrate, push, delete the file.
// README.md has the authoring contract. Requires the agents module.
// ---------------------------------------------------------------------------

import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
