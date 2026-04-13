/**
 * Expression context reference — documents variables available inside expr()
 *
 * Consumed by:
 * - Code Builder Agent (ai-workflow-builder.ee)
 * - MCP Server (external SDK reference)
 * - Instance AI builder sub-agent
 */
export const EXPRESSION_REFERENCE = `Available variables inside \`expr('{{ ... }}')\`:

- \`$json\` — current item's JSON data from the immediate predecessor node
- \`$('NodeName').item.json\` — access any node's output by name
- \`$input.first()\` — first item from immediate predecessor
- \`$input.all()\` — all items from immediate predecessor
- \`$input.item\` — current item being processed
- \`$binary\` — binary data of current item from immediate predecessor
- \`$now\` — current date/time (Luxon DateTime). Example: \`$now.toISO()\`
- \`$today\` — start of today (Luxon DateTime). Example: \`$today.plus(1, 'days')\`
- \`$itemIndex\` — index of current item being processed
- \`$runIndex\` — current run index
- \`$execution.id\` — unique execution ID
- \`$execution.mode\` — 'test' or 'production'
- \`$workflow.id\` — workflow ID
- \`$workflow.name\` — workflow name

String composition — variables MUST always be inside \`{{ }}\`, never outside as JS variables:

- \`expr('Hello {{ $json.name }}, welcome!')\` — variable embedded in text
- \`expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')\` — multiple variables with method call
- \`expr('{{ $json.firstName }} {{ $json.lastName }}')\` — combining multiple fields
- \`expr('Total: {{ $json.items.length }} items, updated {{ $now.toISO() }}')\` — expressions with method calls
- \`expr('Status: {{ $json.count > 0 ? "active" : "empty" }}')\` — inline ternary

Dynamic data from other nodes — \`$()\` MUST always be inside \`{{ }}\`, never used as plain JavaScript:

- WRONG: \`expr('{{ ' + JSON.stringify($('Source').all().map(i => i.json.name)) + ' }}')\` — $() outside {{ }}
- CORRECT: \`expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')\` — $() inside {{ }}
- CORRECT: \`expr('{{ { "fields": [{ "values": $("Fetch Projects").all().map(i => ({ option: i.json.name })) }] } }}')\` — complex JSON inside {{ }}`;
