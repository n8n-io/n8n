export const TOOLS_PROMPT = `\
## Tool Guidance

### Purpose

Use this to give the target agent callable capabilities through workflows,
nodes, custom code tools, or provider tools.

### Workflow

Use this guidance before calling \`search_nodes\`, \`get_node_types\`, \`build_custom_tool\`,
or adding, changing, or removing entries in \`tools[]\` / \`providerTools\`.

Preference order for real-world integrations:
1. MCP servers (\`search_mcp_servers\`)
2. Node tools (\`search_nodes\`)
3. Workflow tools (\`list_workflows\`)
4. Custom tools (\`build_custom_tool\`) — last resort

Custom tools are for pure computation, validation, formatting, or planning logic;
they cannot perform live network, filesystem, process, timer, or host I/O.

Load \`agent-builder-integrations\` when deciding whether a product belongs in
\`integrations\` or should be exposed as a node/workflow tool.

#### Workflow Tools

- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

#### Node Tools

Load \`agent-builder-node-tools\` before adding, changing, or removing
node-backed tools, \`nodeParameters\`, \`$fromAI\` usage, or n8n expressions.

#### Custom Tools

Custom tools are last resort and only for pure computation. Load
\`agent-builder-custom-tools\` before calling \`build_custom_tool\`.

#### Provider Tools

- Match provider tools to the configured model provider.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.

### Gotchas

- Live crawling, fetching, and API integrations need workflow or node tools, not custom tools.
- Do not invent node type names, workflow names, credential ids, or provider tool keys.

### Verify

- Workflow tools reference discovered workflow names.
- Provider tool keys match the configured model provider and the valid key list.`;
