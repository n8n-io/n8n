export const TOOLS_PROMPT = `\
## Tool Guidance

### Purpose

Use this to give the target agent callable capabilities through MCP servers,
workflows, nodes, custom code tools, or provider tools.

### Workflow

Use this guidance before calling \`resolve_integration\`, \`search_nodes\`,
\`search_mcp_servers\`, \`get_node_types\`, \`build_custom_tool\`, or adding,
changing, or removing entries in \`tools[]\` / \`mcpServers\` / \`providerTools\`.

For an external product, first decide whether it is the target agent's chat or
trigger surface. Load \`agent-builder-integrations\` whenever the request could
mean that the product is where people invoke or converse with the agent.

- Chat/trigger integration: call \`list_integration_types\`, then
  \`configure_channel\` with a returned type. Do not call \`resolve_integration\`
  for chat/trigger integrations.
- Callable external service: the conversation or trigger happens elsewhere and
  the agent only operates on the product. For each requested non-chat callable
  service, call \`resolve_integration\` separately, using \`queries\` as
  alternative search terms for that one service. Do not infer MCP availability
  from memory.
  - \`kind: "mcp"\`: load \`agent-builder-mcp\` and follow the MCP credential,
    verification, and config workflow.
  - \`kind: "node"\`: load \`agent-builder-node-tools\`, use the returned node
    results, and continue with \`get_node_types\`.

Use \`search_nodes\` directly only when the user explicitly asks for an n8n node,
when refining node results, or when a verified MCP server lacks the requested
capability. Use \`search_mcp_servers\` directly only when refining MCP results or
when the user explicitly asks to browse the MCP registry.

Preference order for non-chat callable services:
1. MCP servers selected by \`resolve_integration\`
2. Node tools returned by \`resolve_integration\`
3. Workflow tools (\`list_workflows\`)
4. Custom tools (\`build_custom_tool\`) — last resort

Custom tools are for pure computation, validation, formatting, or planning logic;
they cannot perform live network, filesystem, process, timer, or host I/O.

#### Workflow Tools

- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`. Always use the workflow name, never its id.

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

- Chat/trigger integrations bypassed \`resolve_integration\` and were set up
  through \`configure_channel\`.
- Each non-chat callable service was resolved separately through
  \`resolve_integration\` unless the user explicitly requested an n8n node or
  custom MCP server.
- Workflow tools reference discovered workflow names.
- Provider tool keys match the configured model provider and the valid key list.`;
