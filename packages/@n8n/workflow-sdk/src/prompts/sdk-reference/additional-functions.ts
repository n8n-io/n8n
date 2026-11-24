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

- \`sticky('content', nodes?, config?)\` — creates a sticky note instance. Like every other node, the sticky must be passed to \`workflow(...)\` (or \`.add(...)\`) to appear on the canvas. The optional \`nodes\` array is **only used to size and anchor the sticky around those nodes** — it does **not** add them to the workflow; you must still add each wrapped node yourself.
  Example:
  \`\`\`ts
  const httpNode = node({ ... });
  const setNode = node({ ... });
  const note = sticky('## Data Processing', [httpNode, setNode], { color: 2 });
  // All three must be added to the workflow:
  workflow('id', 'name').add(httpNode.to(setNode)).add(note);
  \`\`\`

- \`.output(n)\` — selects a specific output index for multi-output nodes. The index is **0-based**: \`.output(0)\` is the first output, \`.output(1)\` is the second. IF and Switch have dedicated methods (\`onTrue/onFalse\`, \`onCase\`), but \`.output(n)\` works as a generic alternative.
  Example: \`classifier.output(0).to(categoryA); classifier.output(1).to(categoryB)\`

- \`.onError(handler)\` — connects a node's error output to a handler node. Requires \`onError: 'continueErrorOutput'\` in the node config.
  Example: \`httpNode.onError(errorHandler)\` (with \`config: { onError: 'continueErrorOutput' }\`)

- \`nodeJson(node, 'field.path')\` — creates an explicit expression reference to JSON data from a specific node. Use this instead of \`$json\` in AI Agent subnodes, fan-in nodes, or when reading further upstream data.
  Example: \`sessionKey: nodeJson(telegramTrigger, 'message.chat.id')\`

- Additional subnode factories (all follow the same pattern as \`languageModel()\` and \`tool()\`):
  \`memory()\`, \`outputParser()\`, \`embeddings()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\``;
