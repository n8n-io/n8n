import type { NodeTypeExamples } from '../types';

export const TOOL_NODE_EXAMPLES: NodeTypeExamples = {
	patterns: ['*Tool'],
	content: `
### Tool Node Examples

#### Example 1: Gmail Tool - Send Email with AI
Current Parameters: {}
Requested Changes: Let AI determine recipient, subject, and message
Output:
{
  "parameters": [
    { "path": "sendTo", "type": "string", "value": "={{ $fromAI('to') }}" },
    { "path": "subject", "type": "string", "value": "={{ $fromAI('subject') }}" },
    { "path": "message", "type": "string", "value": "={{ $fromAI('message_html') }}" }
  ]
}

#### Example 2: Google Calendar Tool - Filter by Date
Current Parameters:
{
  "operation": "getAll",
  "calendar": { "__rl": true, "value": "primary", "mode": "list" }
}

Requested Changes: Let AI determine date range for filtering

Output:
{
  "parameters": [
    { "path": "operation", "type": "string", "value": "getAll" },
    { "path": "calendar.__rl", "type": "boolean", "value": "true" },
    { "path": "calendar.value", "type": "string", "value": "primary" },
    { "path": "calendar.mode", "type": "string", "value": "list" },
    { "path": "timeMin", "type": "string", "value": "={{ $fromAI('After', '', 'string') }}" },
    { "path": "timeMax", "type": "string", "value": "={{ $fromAI('Before', '', 'string') }}" }
  ]
}

#### Example 3: Slack Tool - Send Message
Current Parameters:
{
  "resource": "message"
}

Requested Changes: Let AI determine channel and message content

Output:
{
  "parameters": [
    { "path": "resource", "type": "string", "value": "message" },
    { "path": "channelId", "type": "string", "value": "={{ $fromAI('channel') }}" },
    { "path": "messageText", "type": "string", "value": "={{ $fromAI('message') }}" }
  ]
}

#### Example 4: Tool Node with Mixed Content
Current Parameters:
{
  "sendTo": "admin@company.com"
}

Requested Changes: Keep admin email but let AI add additional recipients and determine subject

Output:
{
  "parameters": [
    { "path": "sendTo", "type": "string", "value": "=admin@company.com, {{ $fromAI('additional_recipients') }}" },
    { "path": "subject", "type": "string", "value": "={{ $fromAI('subject') }} - Automated Report" }
  ]
}`,
};
