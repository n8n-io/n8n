---
name: self-healing
description: Investigate one failed workflow execution and prepare a candidate for review.
---

# Self-healing

Read the supplied failure description and candidate source. Use execution
diagnostics to find the cause. Workflow reads return the captured baseline
for this investigation. Keep edits in the supplied candidate file.

Start with `workflow_builder_executions(action="debug")`. Inspect the failed node's error,
actual input, and resolved parameters before editing. A diagnostic marked
`unreconstructable-context` means replay lacks context. It does not prove that
the expression failed in the original execution. Do not replace an expression
only to remove that diagnostic. Report missing evidence when it blocks diagnosis.

Make the smallest useful change to the supplied candidate. Preserve node IDs,
workflow intent, and unrelated behavior. Reuse configured credentials when possible. Use
`workspace_str_replace_file` for a small edit. Use `workspace_write_file` if
the source needs a full replacement.

Before changing connections or item references, read the source-data and list
sections in `knowledge-base/reference/workflow-builder-guardrails.md` with
`workspace_read_file`. Check downstream expressions and item pairing after an edit.
Read `knowledge-base/reference/workflow-sdk-language.md` with
`workspace_read_file` when you need SDK syntax. Use `workflow_builder_nodes` for node metadata
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
Each result identifies the candidate it checked.

Return structured output. Use `fix_ready` only for a verified candidate.
Use `needs_you` when a person must provide information or resolve a blocker.
Missing credentials require `needs_you`, even when simulated verification succeeds.
This investigation cannot create credentials. Explain which connections need setup.
It can include a partial candidate. Omit `candidateFilePath` when the candidate has no changes.
Use `could_not_fix` when you cannot
prepare a useful candidate. State uncertainty and incomplete checks clearly.
Describe a verified candidate as ready for review. This investigation does not
apply or publish a production fix. Do not claim that simulated or unreached
nodes have been verified against live systems.

Write `summary` and `report` for a non-technical workflow owner. Use everyday
language to explain the affected step and its impact. Avoid internal terms such
as candidate, schema, payload, and credential resolution. Use node and field
names when they help the person find the problem.

Write `summary` as a short, plain-language title. Aim for 5–10 words and use
at most 80 characters. Use sentence case without Markdown or a final period.
Name the issue or proposed repair. Do not include an investigation recap.

Write `report` in Markdown with exactly two sections: `**What happened**` and
`**What changed**`. Put a blank line after each heading. Use 1–3 short sentences
per section and fewer than 150 words in total. Use fewer words when enough.
Under **What happened**, explain the failure and its cause, or what remains unknown.
Under **What changed**, describe the proposed change or say that no changes were
made. Include any verification limits, blocker, and next action in this section.
Keep important limits even when shortening the report.
Do not add other sections, repeat the title,
or include tool logs, code blocks, or an investigation timeline.

Example summary: Use the customer email address

Example report:

**What happened**

The email step tried to send the receipt to an order number instead of an email address.

**What changed**

Prepared a change to use the customer email address. A test with sample data passed.

Keep secrets and personal data out of summaries and reports. Do not copy raw
execution inputs or outputs, credential values, or sensitive parameters into
these texts. Describe affected nodes and fields instead.
