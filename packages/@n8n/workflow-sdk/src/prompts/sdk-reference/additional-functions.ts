/**
 * Additional SDK functions not covered by main workflow patterns.
 *
 * Consumed by:
 * - Code Builder Agent (ai-workflow-builder.ee)
 * - MCP Server (external SDK reference)
 * - Instance AI builder sub-agent
 */
export const ADDITIONAL_FUNCTIONS = `Additional SDK functions:

- \`placeholder('hint')\` — marks a parameter value for user input. Use directly as the parameter value — never wrap in \`expr()\`, objects, or arrays.
  Example: \`parameters: { url: placeholder('Your API URL (e.g. https://api.example.com/v1)') }\`

- \`sticky('content', nodes?, config?)\` — creates a sticky note on the canvas.
  Example: \`sticky('## Data Processing', [httpNode, setNode], { color: 2 })\`

- \`.output(n)\` — selects a specific output index for multi-output nodes. IF and Switch have dedicated methods (\`onTrue/onFalse\`, \`onCase\`), but \`.output(n)\` works as a generic alternative.
  Example: \`classifier.output(1).to(categoryB)\`

- \`.onError(handler)\` — connects a node's error output to a handler node. Requires \`onError: 'continueErrorOutput'\` in the node config.
  Example: \`httpNode.onError(errorHandler)\` (with \`config: { onError: 'continueErrorOutput' }\`)

- Additional subnode factories (all follow the same pattern as \`languageModel()\` and \`tool()\`):
  \`memory()\`, \`outputParser()\`, \`embeddings()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\``;
