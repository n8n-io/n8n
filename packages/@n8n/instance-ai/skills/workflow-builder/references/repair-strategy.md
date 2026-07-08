# Repair Strategy

When called with failure details for an existing workflow, start from the
workspace source file if one is available in the conversation or tool output. If
you only have a saved n8n workflow ID, use `workflows(action="get-as-code")`,
make the smallest requested edit to the returned code, then call
`build-workflow` once with `filePath` (a stable
`src/workflows/<name>.workflow.ts` path), `workflowId`, and the full edited
code as `sourceCode`. Later repairs should reuse the same `filePath`;
`build-workflow` remembers the bound workflow ID.

For repairs, prefer editing the workspace file directly with file tools
(`workspace_str_replace_file`) and calling `build-workflow` again with the same
`filePath` alone — cheaper than resending full source. `sourceCode` must always
be the complete source when used; never send string patches or fragments.

When the edit is to fix a node the user reports as erroring or showing a red
expression error, inspect it first via `debugging-executions` — run the workflow,
read the failing node's real error and resolved parameters — before editing
anything in this skill. Never guess at the cause or change the node on a hunch.

Modify existing workflows by editing the workspace `.workflow.ts` source file. If
the file was created from `workflows(action="get-as-code")`, pass the real n8n
`workflowId` on the first `build-workflow` call so the file is bound to the
saved workflow. Never pass local SDK workflow IDs as n8n workflow IDs.

Fix errors by editing the same workspace source file and calling
`build-workflow` again with the same `filePath`. Save again before any
verification step.
