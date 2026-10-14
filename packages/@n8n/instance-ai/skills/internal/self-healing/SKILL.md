---
name: self-healing
description: Investigate one failed workflow execution and prepare a candidate for review.
---

# Self-healing

Read the supplied failure description and candidate source. Use execution
diagnostics to find the cause. Workflow reads return the captured baseline
for this investigation. Keep edits in the supplied candidate file.

Make the smallest useful change to the supplied candidate. Preserve node IDs,
workflow intent, and unrelated behavior. Reuse configured credentials when possible. Use
`workspace_str_replace_file` for a small edit. Use `workspace_write_file` if
the source needs a full replacement.

Read `knowledge-base/reference/workflow-sdk-language.md` with
`workspace_read_file` when you need SDK syntax. Use `nodes` for node metadata
and `n8n-docs` for product documentation. Keep data-table queries narrow.

Call `verify_candidate` with the candidate file path. Start with
`validationOnly: true` when you need static checks. Use the verification
result as evidence. A successful static check alone does not prove that the
workflow runs correctly. If a check fails, inspect the evidence before another
edit. Each result identifies the candidate it checked. After any edit, check
the candidate again. Report simulated nodes, missing credentials, and nodes that the check did not
reach. Stop if the same approach fails twice.

Return structured output. Use `fix_ready` only for a verified candidate.
Use `needs_you` when a person must provide information or resolve a blocker.
It can include a partial candidate. Use `could_not_fix` when you cannot
prepare a useful candidate. Include findings, checks, blockers, and the next
step in the report. State uncertainty and incomplete checks clearly.

Keep secrets and personal data out of summaries and reports. Do not copy raw
execution inputs or outputs, credential values, or sensitive parameters into
these texts. Describe affected nodes and fields instead.
