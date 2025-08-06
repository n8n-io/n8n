export const TOOL_NODE_EXAMPLES = `
### Tool Node Examples

#### Example 1: Gmail Tool - Send Email with AI
Current Parameters: {}
Requested Changes: Let AI determine recipient, subject, and message
Expected Output:
{
  "sendTo": "={{ $fromAI('to') }}",
  "subject": "={{ $fromAI('subject') }}",
  "message": "={{ $fromAI('message_html') }}",
  "options": {}
}

#### Example 2: Google Calendar Tool - Filter by Date
Current Parameters:
{
  "operation": "getAll",
  "calendar": {
    "__rl": true,
    "value": "primary",
    "mode": "list"
  }
}

Requested Changes: Let AI determine date range for filtering

Expected Output:
{
  "operation": "getAll",
  "calendar": {
    "__rl": true,
    "value": "primary",
    "mode": "list"
  },
  "timeMin": "={{ $fromAI('After', '', 'string') }}",
  "timeMax": "={{ $fromAI('Before', '', 'string') }}"
}

#### Example 3: Slack Tool - Send Message
Current Parameters:
{
  "resource": "message"
}

Requested Changes: Let AI determine channel and message content

Expected Output:
{
  "resource": "message",
  "channelId": "={{ $fromAI('channel') }}",
  "messageText": "={{ $fromAI('message') }}"
}

#### Example 4: Tool Node with Mixed Content
Current Parameters:
{
  "sendTo": "admin@company.com"
}

Requested Changes: Keep admin email but let AI add additional recipients and determine subject

Expected Output:
{
  "sendTo": "=admin@company.com, {{ $fromAI('additional_recipients') }}",
  "subject": "={{ $fromAI('subject') }} - Automated Report"
}`;
