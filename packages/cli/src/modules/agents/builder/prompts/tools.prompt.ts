export const TOOLS_PROMPT = `\
## Tool Guidance

### Purpose

Use this to give the target agent callable capabilities through workflows,
nodes, custom code tools, or provider tools.

### Workflow

Use this guidance before calling \`search_nodes\`, \`get_node_types\`, \`build_custom_tool\`,
or adding, changing, or removing entries in \`tools[]\` / \`providerTools\`.

Custom tools are for pure computation, validation, formatting, or planning logic;
they cannot perform live network, filesystem, process, timer, or host I/O.

If a product also has a target-agent integration, use node/workflow tools when
the product is only an API capability and the conversation or trigger happens
elsewhere. Use the integration only when that product is the chat/trigger
surface or the agent needs the current platform conversation context. For
example, use Linear node tools for ordinary issue search/create/update when
the agent is triggered from Slack, schedule, Preview, or a workflow; use the
Linear integration only when people will talk to the agent from Linear
issues/comments.

#### Workflow Tools

- Call \`list_workflows\`; reference supported workflows by name with \`{ "type": "workflow", "workflow": "<name>" }\`.

#### Node Tools

- Use \`search_nodes\`, then \`get_node_types\`; never guess node type names.
- Use the tool node id from discovery, usually ending in \`Tool\`.
- Put fixed values in \`nodeParameters\`; use complete n8n expressions for values the agent should decide at runtime:
  \`={{ $fromAI('url', 'The URL to inspect', 'string') }}\`.
- For stable dynamic selectors such as Linear team/teamId, Slack channel, calendar,
  project, board, database, table, model, or other "Name or ID" fields, load skill
  \`agent-builder-resource-locators\` and follow it. Do not use \`$fromAI\` for
  these fields; resolve them at build time and write the exact returned
  \`parameterValue\` into \`nodeParameters\`.
- Never write literal \`"$fromAI"\` or bare \`$fromAI\`; the node will treat it as the actual value.
- Do not pipe AI-chosen fields through \`$json\`.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- For each required credential slot, call \`ask_credential\` once before config mutation. Pass the node's credential key as \`credentialSlot\`. On success, copy the returned \`credentials\` object directly to \`node.credentials\`. If skipped, still add the tool and omit only that credential slot.

#### Custom Tools

- Use \`build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Do not use custom tools for live website crawling, HTTP fetching, API calls, SEO crawlers, or scraping. Use workflow or node tools for those.
- The returned \`id\` is the tool name from the code (e.g. \`new Tool("my_tool")\` → id \`"my_tool"\`).
- Register the returned id in config: \`{ "type": "custom", "id": "<tool name>" }\`.
- Tool names must be unique per agent and use only letters, digits, and underscores.
- To update an existing custom tool (fix a bug, change logic, or rename it): call \`build_custom_tool\` again with the revised code, then update the config.
- If the tool name changed since the last build: register the new id AND remove the old \`{ type: "custom", id: "<old name>" }\` entry from config.
- Custom handlers are pure functions: take validated \`input\`, compute, and return a JSON-serializable value. Do not call \`.build()\`.
- Follow this pattern:
\`\`\`typescript
import { Tool } from '@n8n/agents';
import { z } from 'zod';

export default new Tool('tool_name')
  .description('What the tool does')
  .input(z.object({ query: z.string() }))
  .handler(async ({ query }, ctx) => {
    return { result: query.toUpperCase() };
  });
\`\`\`
- Custom handlers run in a V8 isolate. No network, filesystem, process, Buffer, fetch, timers, wall-clock waiting, or host I/O.
- Some globals may exist as stubs: \`setTimeout\` fires synchronously, \`console.log\` goes nowhere, and \`TextEncoder.encode\` returns its input unchanged.
- Safe globals include \`Math\`, \`Date\`, \`JSON\`, \`RegExp\`, \`Array\`, \`Object\`, \`Map\`, \`Set\`, \`Promise\`, typed arrays, and methods on provided values.
- The handler receives \`(input, ctx)\`; \`ctx.suspend(payload)\` pauses for human-in-the-loop flows. Ignore \`ctx\` otherwise.
- Execution is capped at 5 seconds and about 32 MB memory. If runtime fails, fix the code from the returned error and call \`build_custom_tool\` again.

#### Provider Tools

- Match provider tools to the configured model provider.
- Anthropic: \`providerTools["anthropic.web_search"]\`.
- OpenAI: \`providerTools["openai.web_search"]\` or \`providerTools["openai.image_generation"]\`, only for compatible OpenAI models.

### Gotchas

- Web-search fallback services are config, not node tools, unless the user explicitly asks for a node integration.
- Live crawling, fetching, and API integrations need workflow or node tools, not custom tools.
- Do not include \`inputSchema\` or \`toolDescription\` for node tools.
- \`$fromAI(...)\` placeholders define the node tool input schema; do not add it manually.
- \`get_resource_locator_options\` response values are builder-time config values. Write
  \`parameterValue\` exactly as returned. For resource locators this is an object with
  \`__rl\`, \`mode\`, and \`value\`; for classic dynamic options it is the raw ID/value.
- If \`get_resource_locator_options\` returns \`missing_credentials\`, call \`ask_credential\`
  for one of the returned credential slots and retry. Do not fall back to \`$fromAI\`
  for required stable resource IDs.
- Do not invent node type names, workflow names, credential ids, or provider tool keys.
- If a required node-tool credential is skipped, add the tool and omit only that credential slot.
- \`build_custom_tool\` stores code only; the config still needs a \`{ "type": "custom", "id": "<tool name>" }\` tool ref.
- When a tool is renamed, update the config to use the new name and remove the old entry.

### Verify

- Workflow tools reference discovered workflow names.
- Node tools use discovered tool node ids and valid node parameters.
- Custom tools: returned id equals the tool name; it is registered in config as \`{ type: "custom", id: "<tool name>" }\`.
- Provider tool keys match the configured model provider and the valid key list.`;
