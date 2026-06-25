/**
 * MCP instructions text for workflow builder tools.
 *
 * This is returned via the MCP `InitializeResult.instructions` field,
 * which clients like Claude Desktop inject into their system prompt.
 * It provides a condensed orchestration guide for the tool calling sequence.
 */

import {
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL,
	MCP_UPDATE_WORKFLOW_TOOL,
	MCP_ARCHIVE_WORKFLOW_TOOL,
	MCP_EXPLORE_NODE_RESOURCES_TOOL,
	CODE_BUILDER_GET_NODE_TYPES_TOOL,
	MCP_GET_SDK_REFERENCE_TOOL,
	MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL,
	CODE_BUILDER_SEARCH_NODES_TOOL,
	CODE_BUILDER_VALIDATE_TOOL,
	CODE_BUILDER_VALIDATE_NODE_TOOL,
} from './constants';

export function getMcpInstructions(isBuilderEnabled: boolean): string {
	const INTRO = 'This is the official MCP server for n8n, a workflow automation platform.';

	const BUILDER_INSTRUCTIONS = `This MCP server provides tools to build n8n workflows programmatically using the n8n Workflow SDK.

To build n8n workflows, follow these steps in order:

1. Read the SDK reference: You MUST call ${MCP_GET_SDK_REFERENCE_TOOL.toolName} (or use the n8n://workflow-sdk/reference resource) before writing workflow code. Do not guess SDK syntax.

2. Get workflow best practices: You MUST call ${MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL.toolName} for each workflow technique relevant to the user's request (e.g. "chatbot", "scheduling", "triage"). Call once per technique. Use the returned design guidance, recommended nodes, and common pitfalls to decide which nodes and patterns to use. If you are unsure which techniques apply, call this tool with technique="list" first to see all available techniques.

3. Discover nodes: Call ${CODE_BUILDER_SEARCH_NODES_TOOL.toolName} with queries for services you need (e.g., ["gmail", "slack", "schedule trigger"]), utility nodes (e.g., ["set", "if", "merge", "code"]), and suggested nodes you plan to use. Note the discriminators (resource/operation/mode) in the results.

4. Get type definitions: Call ${CODE_BUILDER_GET_NODE_TYPES_TOOL.toolName} with ALL node IDs you plan to use, including discriminators from search results. This returns the exact TypeScript parameter definitions. DO NOT skip this — guessing parameter names creates invalid workflows.

5. Ground resource locator and load-options values: For any parameter whose type definition shows a \`@searchListMethod\` or \`@loadOptionsMethod\` annotation (e.g. Slack channel pickers, Google Sheets tabs, OpenAI model lists), call ${MCP_EXPLORE_NODE_RESOURCES_TOOL.toolName} with the method name, methodType, and a credentialId from list_credentials. Use a real returned \`value\` in your workflow code instead of inventing IDs.

6. Write the workflow code using the SDK patterns from the reference and the exact parameter names from the type definitions. Follow the coding guidelines and design guidance sections of the SDK reference (retrieve them with ${MCP_GET_SDK_REFERENCE_TOOL.toolName} using sections "guidelines" and "design").

7. Spot-check as you go: after configuring each node, call ${CODE_BUILDER_VALIDATE_NODE_TOOL.toolName} on it before wiring it into the rest of the workflow. Catches param, type, and discriminator errors per-node with a clean signal, before they're buried inside a full-graph ${CODE_BUILDER_VALIDATE_TOOL.toolName} run. Can check several candidate configs in one call so you wire only the one that passes.

8. Validate: Call ${CODE_BUILDER_VALIDATE_TOOL.toolName} with your full code. Fix any errors and re-validate until valid.

9. Create: Call ${MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName} with the validated code to save the workflow to n8n. Include a short \`description\` (1-2 sentences, max 255 chars) summarizing what the workflow does — this helps users find and understand their workflows.

10. Update: Call ${MCP_UPDATE_WORKFLOW_TOOL.toolName} with the workflow ID and a list of operations (addNode, removeNode, updateNodeParameters, setNodeParameter, renameNode, addConnection, removeConnection, setNodeCredential, setNodePosition, setNodeDisabled, setNodeSettings, setWorkflowMetadata). The whole batch is atomic: if any op fails the workflow is unchanged. To modify an existing node's configuration, use updateNodeParameters or setNodeParameter — do NOT use removeNode followed by addNode for the same node, as this disconnects any attached sub-nodes (LLM models, memory, tools) and they will not be re-attached automatically. Use setNodeSettings to change a node's execution behavior (onError, retryOnFail, maxTries, waitBetweenTries, alwaysOutputData, executeOnce); for sub-nodes (LLM model, memory, tools) this is the only way to set onError, because the canvas UI does not expose that setting for them.

11. Archive: Call ${MCP_ARCHIVE_WORKFLOW_TOOL.toolName} with the workflow ID.`;

	return isBuilderEnabled ? `${INTRO}\n\n${BUILDER_INSTRUCTIONS}` : INTRO;
}
