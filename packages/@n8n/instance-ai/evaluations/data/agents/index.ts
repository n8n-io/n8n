// ---------------------------------------------------------------------------
// Intent-resolution eval cases for the agents module (`--tier agents`).
//
// Cases are user-voiced build requests asked plan-first ("walk me through how
// you'd set this up first") and graded on the approach the assistant PROPOSES
// — workflow vs n8n Agent vs asking a clarifying question vs answering
// directly — via ordinary processExpectations judged from the transcript. The
// build itself is never exercised: a director turn declines every plan/setup
// approval, keeping runs fast (~30-60s) and the expectations decoupled from
// the agent-build tool surface, which is being redesigned (dedicated
// sub-agent). Only load_skill(intent-recognition) is asserted by name.
// Requires N8N_ENABLED_MODULES=agents,instance-ai.
//
// The exam-style corpus (loader-injected classification preamble + fenced
// ```intent block, exact-match graded) lives in ../agents-exam as a fast
// dev-loop alternative; most cases here share its utterances. See README.md.
// ---------------------------------------------------------------------------

import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export function loadAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
