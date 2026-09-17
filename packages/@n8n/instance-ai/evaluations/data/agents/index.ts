// ---------------------------------------------------------------------------
// Author Agent-focused cases here and run them with `--tier agents`.
// Process expectations grade the conversation. Outcome expectations grade the
// built Agent. Execution scenarios can run the Agent with mocked tools. The
// corpus lives in the LangTracer `agents` suite. Author a case here, calibrate
// it, push it, and delete the local file. Requires the agents module.
// ---------------------------------------------------------------------------

import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
