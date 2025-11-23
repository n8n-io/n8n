export const TOOL_NODES_GUIDE = `
## CRITICAL: $fromAI Expression Support for Tool Nodes

Tool nodes (nodes ending with "Tool" like Gmail Tool, Google Calendar Tool, etc.) support a special $fromAI expression that allows AI to dynamically fill parameters at runtime.

### When to Use $fromAI
- ONLY available in tool nodes (node types ending with "Tool")
- Use when the AI should determine the value based on context
- Ideal for parameters that vary based on user input or conversation context

### $fromAI Syntax
\`={{ $fromAI('key', 'description', 'type', defaultValue) }}\`

### Parameters
- key: Unique identifier (1-64 chars, alphanumeric/underscore/hyphen)
- description: Optional description for the AI (use empty string '' if not needed)
- type: 'string' | 'number' | 'boolean' | 'json' (defaults to 'string')
- defaultValue: Optional fallback value

### Tool Node Examples

#### Gmail Tool - Sending Email
{
  "sendTo": "={{ $fromAI('to') }}",
  "subject": "={{ $fromAI('subject') }}",
  "message": "={{ $fromAI('message_html') }}"
}

#### Google Calendar Tool - Filtering Events
{
  "timeMin": "={{ $fromAI('After', '', 'string') }}",
  "timeMax": "={{ $fromAI('Before', '', 'string') }}"
}

### Mixed Usage Examples
You can combine $fromAI with regular text:
- "Subject: {{ $fromAI('subject') }} - Automated"
- "Dear {{ $fromAI('recipientName', 'Customer name', 'string', 'Customer') }},"

### Important Rules
1. ONLY use $fromAI in tool nodes (check if node type ends with "Tool")
2. For timeMin/timeMax and similar date fields, use appropriate key names
3. The AI will fill these values based on context during execution
4. Don't use $fromAI in regular nodes like Set, IF, HTTP Request, etc.

## Tool Node Parameter Guidelines

### Identifying Tool Nodes
1. CHECK NODE TYPE: If the node type ends with "Tool", it supports $fromAI expressions
2. COMMON TOOL NODES:
   - Gmail Tool (gmailTool): to, subject, message → use $fromAI
   - Google Calendar Tool (googleCalendarTool): timeMin, timeMax → use $fromAI
   - Slack Tool (slackTool): channel, message → use $fromAI
   - Microsoft Teams Tool: channel, message → use $fromAI
   - Telegram Tool: chatId, text → use $fromAI
   - Other communication/document tools: content fields → use $fromAI

### When to Use $fromAI in Tool Nodes
1. DYNAMIC VALUES: Use $fromAI for values that should be determined by AI based on context
2. USER INPUT FIELDS: Recipients, subjects, messages, date ranges
3. PRESERVE EXISTING: If a parameter already uses $fromAI, keep it unless explicitly asked to change
4. DATE/TIME FIELDS: Use descriptive key names for clarity

### Tool Node Parameter Patterns
- Email recipients: "={{ $fromAI('to') }}"
- Email subjects: "={{ $fromAI('subject') }}"
- Message content: "={{ $fromAI('message_html') }}" or "={{ $fromAI('message') }}"
- Date ranges: "={{ $fromAI('After', '', 'string') }}"
- Channel IDs: "={{ $fromAI('channel') }}"`;
