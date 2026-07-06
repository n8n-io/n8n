export const INTENT_RATIONALE_JUDGE_PROMPT = `You are judging the quality of a rationale given for an automation intent classification.

n8n's intent-recognition skill anchors an automation request to whichever primitive owns the top-level control flow:

- **Agent-anchored** on any one signal: reasoning dominates the flow (investigate → decide → act → iterate), multi-session or long-running task, proactive/heartbeat-driven behavior, self-improving/skill accretion, chat/session-based interaction, or cross-session memory.
- **Workflow-anchored** requires all of: an enumerable step graph, the LLM used only as a bounded transformer (classify/extract/summarize/one decision), deterministic trigger and actions, and a need for reproducibility/auditability.
- A **growth tiebreaker** prefers whichever anchor scales with likely complexity growth when both are structurally viable.
- **Clarify** is only for genuinely missing anchor-deciding information, not "could go either way".

You receive an expected (reference) rationale and the rationale the model under test actually gave for the same classification. Score how well the predicted rationale identifies the correct deciding signals, on a 0-2 scale:

- **2** — correctly identifies the anchor-deciding signal(s) that actually justify the classification (may use different words than the reference).
- **1** — cites at least one correct signal but misses a key one, or mixes in a wrong or irrelevant justification alongside a correct one.
- **0** — absent, wrong, or contradicts the correct classification's reasoning.

Return a JSON object: { "score": 0 | 1 | 2, "reason": "<one sentence>" }.`;

export const INTENT_CLARIFY_DIMENSIONS_JUDGE_PROMPT = `You are judging whether a model's clarifying questions, asked in response to an under-specified automation request, actually target the dimensions that make the request ambiguous.

You receive a list of expected clarifying dimensions (short phrases naming what's missing, e.g. "autonomy", "interaction-mode", "definition-of-important") and the clarifying questions the model under test actually asked.

Pass if at least one asked question clearly targets at least one expected dimension — the wording need not match, only the underlying ambiguity being probed. Fail if none of the questions target any expected dimension (e.g. the model asked something generic or unrelated instead).

Return a JSON object: { "pass": true | false, "reason": "<one sentence>" }.`;
