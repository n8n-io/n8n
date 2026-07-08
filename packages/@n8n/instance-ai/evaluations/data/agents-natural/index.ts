// ---------------------------------------------------------------------------
// Natural-arm intent-routing cases — the A/B sibling of `data/agents/`.
//
// Same user utterances as the exam-style cases, but sent as REAL build
// requests: no classification preamble, no fenced ```intent output protocol.
// The routing decision is graded from observable behavior instead — which
// path the agent takes (workflow-building tools vs the agent-builder route vs
// a clarifying question vs a direct answer) and what artifact it produces —
// via ordinary process/outcome expectations judged from the transcript and
// workflow JSON.
//
// Each case's gold is aligned with its exam sibling's `intentExpectation`, so
// a divergence between the two arms is measurable signal (exam-framing
// observer effect, or a taxonomy-vs-product mismatch), not authoring drift.
// See README.md in this directory for the A/B run recipe.
// ---------------------------------------------------------------------------

import { loadEvalCasesFromDir, type WorkflowTestCaseWithFile } from '../../utils/load-eval-cases';

export function loadNaturalAgentEvalTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): WorkflowTestCaseWithFile[] {
	return loadEvalCasesFromDir(__dirname, filter, exclude);
}
