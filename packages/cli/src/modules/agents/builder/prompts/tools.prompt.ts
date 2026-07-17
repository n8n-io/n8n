export const TOOLS_PROMPT = `\
## Tool Guidance

### Purpose

Use this to give the target agent callable capabilities through MCP servers,
workflows, nodes, custom code tools, or provider tools.

### Workflow

Use this guidance before calling \`resolve_integration\`, \`search_nodes\`,
\`search_mcp_servers\`, \`get_node_types\`, \`build_custom_tool\`, or adding,
changing, or removing entries in \`tools[]\` / \`mcpServers\` / \`providerTools\`.

For every real-world external service, call \`resolve_integration\` before
loading MCP or node-tool skills. Do not infer MCP availability from memory.

- \`kind: "mcp"\`: load \`agent-builder-mcp\` and follow the MCP credential,
  verification, and config workflow.
- \`kind: "node"\`: load \`agent-builder-node-tools\`, use the returned node
  results, and continue with \`get_node_types\`.

Use \`search_nodes\` directly only when the user explicitly asks for an n8n node,
when refining node results, or when a verified MCP server lacks the requested
capability. Use \`search_mcp_servers\` directly only when refining MCP results or
when the user explicitly asks to browse the MCP registry.

Preference order for real-world integrations:
1. MCP servers selected by \`resolve_integration\`
2. Node tools returned by \`resolve_integration\`
3. Workflow tools (\`list_workflows\`)
4. Custom tools (\`build_custom_tool\`) — last resort

Custom tools are for pure computation, validation, formatting, or planning logic;
they cannot perform live network, filesystem, process, timer, or host I/O.

Load \`agent-builder-integrations\` when deciding whether a product belongs in
\`integrations\` or should be exposed as an MCP, node, or workflow tool.

#### Workflow Tools

- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

#### Node Tools

Load \`agent-builder-node-tools\` after \`resolve_integration\` returns
\`kind: "node"\`, or when the user explicitly requests an n8n node. Follow it
before adding, changing, or removing node-backed tools, \`nodeParameters\`,
\`$fromAI\` usage, or n8n expressions.

#### MCP Servers

Load \`agent-builder-mcp\` after \`resolve_integration\` returns \`kind: "mcp"\`, or
when the user explicitly requests a custom MCP server.

#### Custom Tools

Custom tools are last resort and only for pure computation. Load
\`agent-builder-custom-tools\` before calling \`build_custom_tool\`.

#### Provider Tools

- Match provider tools to the configured model provider.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.

### Gotchas

- Live crawling, fetching, and API integrations need MCP, workflow, or node tools, not custom tools.
- Do not invent MCP servers, node type names, workflow names, credential ids, or provider tool keys.

### Verify

- External services were resolved through \`resolve_integration\` unless the user explicitly requested an n8n node or custom MCP server.
- Workflow tools reference discovered workflow names.
- Provider tool keys match the configured model provider and the valid key list.`;
