import type { RuntimeSkill } from '@n8n/agents';

export function customToolsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-custom-tools',
		name: 'Agent Builder Custom Tools',
		description:
			'Use when building, updating, or registering a pure computation, validation, formatting, or planning tool with build_custom_tool. Not for HTTP, API, crawling, filesystem, or other live integrations — use node or workflow tools for those.',
		recommendedTools: ['build_custom_tool', 'read_config', 'patch_config'],
		allowedTools: [
			'build_custom_tool',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
		],
		instructions: `\
## Purpose

Use this to write and register a custom code tool for pure computation logic
that no node, workflow, or MCP tool covers.

## Workflow

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

## Gotchas

- \`build_custom_tool\` stores code only; the config still needs a \`{ "type": "custom", "id": "<tool name>" }\` tool ref.
- When a tool is renamed, update the config to use the new name and remove the old entry.

## Verify

- Custom tools: returned id equals the tool name; it is registered in config as \`{ type: "custom", id: "<tool name>" }\`.`,
	};
}
