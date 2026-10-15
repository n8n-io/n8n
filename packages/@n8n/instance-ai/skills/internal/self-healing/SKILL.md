---
name: self-healing
description: Investigate one failed workflow execution and prepare a candidate for review.
---

# Self-healing

Read the supplied failure description and candidate source. Use execution
diagnostics to find the cause. Read other workflows or executions only when
they help explain the failure. Live workflow reads provide context. They do
not replace the supplied candidate or its baseline.

Start with `executions(action="debug")`. Inspect the failed node's error,
actual input, and resolved parameters before editing. A diagnostic marked
`unreconstructable-context` means replay lacks context. It does not prove that
the expression failed in the original execution. Do not replace an expression
only to remove that diagnostic. Report missing evidence when it blocks diagnosis.

Make the smallest useful change to the supplied candidate. Preserve node IDs,
credential references, workflow intent, and unrelated behavior. Use
`workspace_str_replace_file` for a small edit. Use `workspace_write_file` if
the source needs a full replacement.

Before changing connections or item references, read the source-data and list
sections in `knowledge-base/reference/workflow-builder-guardrails.md` with
`workspace_read_file`. Check downstream expressions and item pairing after an edit.
Read `knowledge-base/reference/workflow-sdk-language.md` with
`workspace_read_file` when you need SDK syntax. Use `nodes` for node metadata
and follow `@builderHint` annotations in the relevant type definition.
Use `n8n-docs` for product documentation. Keep data-table queries narrow.

Call `verify_candidate` with the candidate file path. Start with
`validationOnly: true` when you need static checks. For execution checks, pass
`triggerNodeName` to select the trigger from the failed execution. Use execution
diagnostics to supply `inputData` through the adapter shape described by the
tool. A trigger's recorded output can differ from the adapter's input.
If verification produces unexpected empty values, check the test input first.
Correct malformed test input before changing a production expression. Verify
other triggers in separate calls when needed. A successful run of an unrelated
trigger does not prove the repair. Use the verification
result as evidence. A successful static check alone does not prove that the
workflow runs correctly. If a check fails, inspect the evidence before another
edit. After any edit, check the candidate again. Report simulated nodes, missing
credentials, and nodes that the check did not reach. Stop if the same approach
fails twice.

Return structured output. Use `fix_ready` only for a verified candidate.
Use `needs_you` when a person must provide information or resolve a blocker.
It can include a partial candidate. Use `could_not_fix` when you cannot
prepare a useful candidate. Include findings, checks, blockers, and the next
step in the report. State uncertainty and incomplete checks clearly.
Describe a verified candidate as ready for review. This investigation does not
apply or publish a production fix. Do not claim that simulated or unreached
nodes have been verified against live systems.

Keep secrets and personal data out of summaries and reports. Do not copy raw
execution inputs or outputs, credential values, or sensitive parameters into
these texts. Describe affected nodes and fields instead.
