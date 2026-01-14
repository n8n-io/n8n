import type { NodeTypeGuide } from '../types';

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

#### AI Agent with Structured Output Parser
When referencing output from an AI Agent (n8n-nodes-langchain.agent) that has a Structured Output Parser connected, the output is wrapped in an "output" object:
- Use \`$json.output.fieldName\` instead of \`$json.fieldName\`
- Use \`$('AI Agent').item.json.output.fieldName\` for explicit node reference
- WRONG: \`$json.summary\` → CORRECT: \`$json.output.summary\`

#### Webhook Node Output Structure
Webhook nodes (n8n-nodes-base.webhook) output data in a specific structure:
- \`$json.headers\` - HTTP request headers object
- \`$json.params\` - URL path parameters (from routes like /users/:id)
- \`$json.query\` - Query string parameters (?user_id=123&status=active)
- \`$json.body\` - Request payload (JSON body, form data, etc.)

Examples:
- Query parameter: \`$json.query.user_id\` (from ?user_id=123)
- JSON body field: \`$json.body.userName\` (from POST body)
- Header value: \`$json.headers.authorization\`
- Path param: \`$json.params.id\` (from /users/:id route)

CRITICAL: Do NOT use \`$json.fieldName\` directly for Webhook data - always specify the container (body, query, params, or headers).

#### Form Trigger Output Structure
Form Trigger nodes (n8n-nodes-base.formTrigger) output form field values at the root level:
- Use \`$json.fieldName\` directly for form fields
- This is different from Webhook - form data is NOT nested in \`body\``,
};
