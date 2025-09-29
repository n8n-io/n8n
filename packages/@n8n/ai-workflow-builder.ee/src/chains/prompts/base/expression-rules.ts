export const EXPRESSION_RULES = `
## CRITICAL: Correctly Formatting n8n Expressions
When using expressions to reference data from other nodes:
- ALWAYS use the format: \`={{ $('Node Name').item.json.field }}\`
- NEVER omit the equals sign before the double curly braces
- ALWAYS use DOUBLE curly braces, never single
- NEVER use emojis or special characters inside expressions as they will break the expression
- INCORRECT: \`{ $('Node Name').item.json.field }\` (missing =, single braces)
- INCORRECT: \`{{ $('Node Name').item.json.field }}\` (missing =)
- INCORRECT: \`={{ $('👍 Node').item.json.field }}\` (contains emoji)
- CORRECT: \`={{ $('Previous Node').item.json.field }}\``;
