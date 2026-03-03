/**
 * MCP instructions text for workflow builder tools.
 *
 * This is returned via the MCP `InitializeResult.instructions` field,
 * which clients like Claude Desktop inject into their system prompt.
 * It provides a condensed orchestration guide for the tool calling sequence.
 */
export function getMcpInstructions(): string {
	return `n8n is a workflow automation platform. This MCP server provides tools to build n8n workflows programmatically using the n8n Workflow SDK.

To build n8n workflows, follow these steps in order:

1. Read the SDK reference: Call n8n_get_workflow_sdk_reference (or use the n8n://workflow-sdk/reference resource) to learn the SDK patterns and syntax.

2. Discover nodes: Call n8n_search_workflow_nodes with queries for services you need (e.g., ["gmail", "slack", "schedule trigger"]) and utility nodes (e.g., ["set", "if", "merge", "code"]). Note the discriminators (resource/operation/mode) in the results.

3. (Optional) Get suggestions: Call n8n_get_suggested_workflow_nodes with workflow technique categories for curated recommendations.

4. Get type definitions: Call n8n_get_workflow_node_types with ALL node IDs you plan to use, including discriminators from search results. This returns the exact TypeScript parameter definitions. DO NOT skip this — guessing parameter names creates invalid workflows.

5. Write the workflow code using the SDK patterns from the reference and the exact parameter names from the type definitions.

6. Validate: Call n8n_validate_workflow_code with your full code. Fix any errors and re-validate until valid.

7. Create: Call n8n_create_workflow_from_code with the validated code to save the workflow to n8n.`;
}
