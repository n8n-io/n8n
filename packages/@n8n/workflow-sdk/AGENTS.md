# AGENTS.md

Guidance for working with the `@n8n/workflow-sdk` package.

## Keep the README up to date

`README.md` is the SDK documentation on npm. It shows how to install the SDK,
one example, and how to convert code to workflow JSON. For everything else, it
points to the MCP `get_workflow_sdk_reference` tool.

Update `README.md` in the same PR when you change something that it shows: the
builder functions in the example, `parseWorkflowCodeToBuilder`,
`validateWorkflowBuilder`, or the rule that the interpreter rejects `import`
declarations.

Keep the README short. Do not copy the SDK reference into it. The reference is
in `src/prompts/sdk-reference/`, and the MCP tool serves it.

Make sure that the README example parses and validates with
`parseWorkflowCodeToBuilder` and `validateWorkflowBuilder`.
