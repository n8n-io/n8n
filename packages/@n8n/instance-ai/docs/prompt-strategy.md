# Prompt strategy

## Policy ownership

Keep each behavioral policy in one owner. A tool result can select a next step.
It must not redefine the policy or overstate the result.

| Source | Owns |
|---|---|
| `src/agent/shared-prompts.ts` | Questions, evidence, completion, and recovery |
| `src/agent/system-prompt.ts` | Instance context, communication, capabilities, and setup surfaces |
| `skills/workflow-builder/SKILL.md` | Discovery, source edits, validation, and submission |
| `skills/post-build-flow/SKILL.md` | Verification routes, setup, explicit publication, and cleanup |
| `skills/planned-task-runtime/SKILL.md` | Task handoffs, checkpoints, and synthesis |
| Node hints and references | Node-specific facts and detailed procedures |
| SDK observer and reflector prompts | Preserve decisions and evidence with their scope and provenance |

The embedded Agent Builder has its own tools and initial-build procedure.
Keep its question, evidence, and language rules consistent with Instance AI.
Do not import workflow-specific procedures into its prompt.

## Evidence

Distinguish saved source, static validation, submitted builds, simulated checks,
and live execution. Bind each claim to the target artifact and current material
changes. Inspect required paths and effect outputs. Overall execution success
does not prove every branch or external effect.

A material edit invalidates evidence for the affected behavior. Separate test
scenarios can cover mutually exclusive branches on the same current workflow.
Missing evidence requires a precise limit, not a claim of failure or success.
Explicit publication with disclosed limitations remains a supported user choice.

## Questions and completion

Discover facts before asking the user. Before a workflow build, ask only about
intent or topology. Leave missing setup values and ambiguous credential choices
for post-build setup. Ask one or two blocking questions when possible. Ask no
more than three in a card. Do not divide an optional questionnaire across cards.

Reuse answers and respect skips. A normal action request continues to a result,
a required handoff, or a blocker. Research and source edits are intermediate
steps in a build request. Keep the existing silence rules for pending cards and
planned-task follow-ups.

## Skill loading

Keep core decisions in the skill body. Move detailed recipes and examples to
references. Give each reference an explicit load condition. Reuse instructions
while they remain in context. Permit reloads after context loss or a version
change.

Successful direct builds inline selected post-build instructions. The selection
in `build-workflow.tool.ts` excludes verification-follow-up, setup-follow-up,
and credentials-before-build sections by heading. Preserve those boundaries
when changing headings. References needed by direct builds must remain reachable
from the inline body. Do not assume that inline content includes the full skill.

## Review and evaluation

Review the assembled prompt, not only individual strings. Check the normal,
read-only, direct-build, tagged-follow-up, and embedded-builder paths.

Use existing evaluation tooling to compare the same scenarios and model settings.
Include these cases:

- Partial coverage, simulated writes, and material edits after verification.
- Separate triggers and mutually exclusive branches.
- Explicit publication with disclosed untested behavior.
- Missing credentials, ambiguous selections, and a previously skipped setup.
- Research followed by a build, a failed save, and valid card suspension.
- Repeated errors, uncertain timeout outcomes, and distinct test scenarios.
- Skill reuse and reference loading after context loss.
- Host-returned user choices versus instructions inside external data.
- User-language preservation through English tool results.

Unit tests check prompt composition and reference availability. They do not prove
that a model follows the policy. Report behavioral evaluation results separately.
Do not infer reduced abandonment from prompt size or tool-call counts alone.
