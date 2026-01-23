/**
 * Parameter Updater Prompt (Opus-optimized)
 *
 * Updates node parameters based on natural language instructions.
 * Consolidated from ~1,571 lines across 17 files to ~150 lines for Opus 4.5.
 *
 * NOTE: All curly braces in JSON examples are escaped as {{ }} for LangChain template compatibility.
 */

export const CORE_INSTRUCTIONS = `Update the parameters of an n8n node based on natural language instructions.
Return the COMPLETE parameters object with both modified and unmodified parameters.

Rules:
1. Start with current parameters, modify only what's requested
2. Preserve array structures (rules.values[], fields.values[], conditions[])
3. Use proper expression format: ={{{{ $('Node Name').item.json.field }}}}
4. For resourceLocator parameters: {{{{ __rl: true, mode: 'list'|'id', value: 'the-value' }}}}
5. Tool nodes (ending in "Tool") can use $fromAI expressions
6. Generate unique IDs for array items: "id-1", "id-2", etc.
7. Placeholders: copy exactly as <__PLACEHOLDER_VALUE__LABEL__>

Return only the complete updated parameters object.`;

export const COMMON_PATTERNS = `
## Pattern Reference

### IF Node Conditions
{{{{
  "conditions": {{{{
    "options": {{{{ "caseSensitive": false, "leftValue": "", "typeValidation": "loose" }}}},
    "conditions": [
      {{{{
        "id": "id-1",
        "leftValue": "={{{{ $json.status }}}}",
        "rightValue": "active",
        "operator": {{{{ "type": "string", "operation": "equals" }}}}
      }}}}
    ],
    "combinator": "and"
  }}}}
}}}}

Operators: equals, notEquals, contains, startsWith, endsWith, gt, lt, gte, lte, exists, notEmpty
Types: string, number, boolean, array

### Switch Node Rules
{{{{
  "mode": "rules",
  "rules": {{{{
    "values": [
      {{{{
        "conditions": {{{{
          "options": {{{{ "caseSensitive": true, "leftValue": "", "typeValidation": "strict" }}}},
          "conditions": [
            {{{{ "leftValue": "={{{{ $json.type }}}}", "rightValue": "email", "operator": {{{{ "type": "string", "operation": "equals" }}}} }}}}
          ],
          "combinator": "and"
        }}}},
        "renameOutput": true,
        "outputKey": "Email"
      }}}}
    ]
  }}}}
}}}}

For numeric ranges, use 2 conditions with "and" combinator (gte + lte).

### Set Node Fields
{{{{
  "fields": {{{{
    "values": [
      {{{{ "name": "status", "type": "stringValue", "stringValue": "processed" }}}},
      {{{{ "name": "timestamp", "type": "stringValue", "stringValue": "={{{{ $now }}}}" }}}},
      {{{{ "name": "count", "type": "numberValue", "numberValue": 42 }}}}
    ]
  }}}},
  "options": {{{{}}}}
}}}}

Types: stringValue, numberValue, booleanValue, objectValue, arrayValue

### Tool Node $fromAI
{{{{
  "sendTo": "={{{{ $fromAI('recipient', 'Email address to send to', 'string') }}}}",
  "subject": "={{{{ $fromAI('subject', 'Email subject line', 'string') }}}}",
  "message": "={{{{ $fromAI('body', 'Email body content', 'string') }}}}"
}}}}

$fromAI is designed specifically for Tool nodes (types ending in "Tool") where the AI Agent provides values at runtime.

### ResourceLocator Parameters
{{{{
  "calendarId": {{{{
    "__rl": true,
    "mode": "list",
    "value": "primary"
  }}}}
}}}}

Modes: "list" (dropdown selection), "id" (direct ID input)

### HTTP Request
{{{{
  "method": "POST",
  "url": "https://api.example.com/endpoint",
  "sendHeaders": true,
  "headerParameters": {{{{
    "parameters": [
      {{{{ "name": "Content-Type", "value": "application/json" }}}}
    ]
  }}}},
  "sendBody": true,
  "bodyParameters": {{{{
    "parameters": [
      {{{{ "name": "data", "value": "={{{{ $json.payload }}}}" }}}}
    ]
  }}}}
}}}}
`;

/** Instance URL for webhook nodes */
export function instanceUrlPrompt(instanceUrl: string): string {
	return `n8n instance URL: ${instanceUrl}\nUse for webhook and chat trigger endpoints.`;
}

/** Build the full parameter updater prompt */
export function buildParameterUpdaterPrompt(): string {
	return CORE_INSTRUCTIONS + '\n' + COMMON_PATTERNS;
}
