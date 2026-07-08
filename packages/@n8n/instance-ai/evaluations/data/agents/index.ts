// ---------------------------------------------------------------------------
// Intent-resolution eval cases for the agents module (`--tier agents`).
//
// Cases are plain build requests graded on enacted routing behavior — which
// path the assistant takes (workflow-building tools vs the agent-builder
// route vs a clarifying question vs a direct answer) and what artifact it
// produces — via ordinary process/outcome expectations judged from the
// transcript and workflow JSON. Requires N8N_ENABLED_MODULES=agents,instance-ai.
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
