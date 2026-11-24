import type { NodeTypeGuide } from './types';

/**
 * Guide for correctly referencing output from special node types.
 *
 * Some nodes have non-standard output structures that require specific
 * referencing patterns. This guide helps the parameter updater generate
 * correct expressions when data comes from these nodes.
 */
export const PREDECESSOR_OUTPUT_GUIDE: NodeTypeGuide = {
	patterns: ['*'], // Applies to all nodes being configured
	content: `
### Referencing Output from Special Node Types

#### AI Agent Output Structure
AI Agent nodes (n8n-nodes-langchain.agent) wrap their response in an "output" object:
- Without Structured Output Parser: Use \`$json.output\` to access the response string
- With Structured Output Parser (hasOutputParser: true in node settings): Use \`$json.output.fieldName\` to access parsed fields
- Use \`$('AI Agent').item.json.output.fieldName\` when referencing a node, instead of \`$('AI Agent').item.json.fieldName\`
- WRONG: \`$json.summary\` → CORRECT: \`$json.output.summary\`

#### AI Agent Subnode Input Context
AI Agent subnodes (memory, language models, tools, parsers, retrievers, and vector stores) are connected through AI connections, not the normal main data path.
- For memory custom session keys, do NOT use \`$json.chatId\` or \`$json.sessionId\`; reference the trigger/source node explicitly.
- Use \`nodeJson(triggerNode, 'message.chat.id')\` or \`$('Trigger Node').item.json.message.chat.id\`.
- For tool parameters controlled by the agent, use \`$fromAI(...)\` instead of upstream JSON.
- The built-in Chat Trigger memory shortcut is \`sessionIdType: 'fromInput'\`, where no custom session key expression is needed.

#### Webhook Node Output Structure
When referencing data from a Webhook node (n8n-nodes-base.webhook), the incoming request is structured under \`$json\`:
- \`$json.headers\` - HTTP headers, example: \`$json.headers.authorization\`
- \`$json.params\` - URL path parameters, example route: \`/users/:id\`, access: \`$json.params.id\`
- \`$json.query\` - Query string parameters, example URL: \`?user_id=123\`, access: \`$json.query.user_id\`
- \`$json.body\` - Request payload, example JSON: \`{ "userName": "sam" }\`, access: \`$json.body.userName\`

CRITICAL: When referencing data from a Webhook node, do NOT use \`$json.fieldName\` directly - always specify the container (body, query, params, or headers).`,
};
