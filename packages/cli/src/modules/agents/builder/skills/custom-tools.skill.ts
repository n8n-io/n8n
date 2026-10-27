import type { RuntimeSkill } from '@n8n/agents';

export function customToolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-custom-tools',
		name: 'Agent Builder Custom Tools',
		description:
			'Use when building, updating, or registering pure computation, validation, formatting, or planning tool with agent_builder_build_custom_tool. Not for HTTP, API, crawling, filesystem, or other live integrations — use node or workflow tools for those.',
		recommendedTools: [
			'agent_builder_build_custom_tool',
			'agent-context',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent_builder_build_custom_tool',
			'agent_builder_ask_questions',
			'agent-context',
			'agent_builder_patch_config',
			'agent_builder_write_config',
		],
		instructions: `\
## Purpose

Write and register custom code tool for pure computation logic
that no node, workflow, or MCP tool covers.

## Workflow

- Use \`agent_builder_build_custom_tool\` with \`export default new Tool(...)\` and imports only from \`@n8n/agents\` and \`zod\`.
- Do not use custom tools for live website crawling, HTTP fetching, API calls, SEO crawlers, or scraping. Use workflow or node tools for those.
- Returned \`id\` is tool name from code (e.g. \`new Tool("my_tool")\` → id \`"my_tool"\`).
- Register returned id in config: \`{ "type": "custom", "id": "<tool name>" }\`.
- Tool names must be unique per agent and use only letters, digits, and underscores.
- To update existing custom tool (fix bug, change logic, or rename it): call \`agent_builder_build_custom_tool\` again with revised code, then update config.
- If tool name changed since last build: register new id AND remove old \`{ type: "custom", id: "<old name>" }\` entry from config.
- Custom handlers are pure functions: take validated \`input\`, compute, and return JSON-serializable value. Do not call \`.build()\`.
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
- Handler receives \`(input, ctx)\`; \`ctx.suspend(payload)\` pauses for human-in-the-loop flows. Ignore \`ctx\` otherwise.
- Execution is capped at 5 seconds and about 32 MB memory. If runtime fails, fix code from returned error and call \`agent_builder_build_custom_tool\` again.

## Gotchas

- \`agent_builder_build_custom_tool\` stores code only; config still needs \`{ "type": "custom", "id": "<tool name>" }\` tool ref.

## Verify

- Custom tools: returned id equals tool name; it is registered in config as \`{ type: "custom", id: "<tool name>" }\`.`,
	};
}
