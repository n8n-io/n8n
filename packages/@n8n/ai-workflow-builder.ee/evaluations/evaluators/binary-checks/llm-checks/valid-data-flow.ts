import { createLlmCheck } from './create-llm-check';

export const validDataFlow = createLlmCheck({
	name: 'valid_data_flow',
	systemPrompt: `You are an evaluator checking whether expressions in an n8n workflow reference fields that actually exist upstream.

For each expression in node parameters, check:
1. \`{{ $json.fieldName }}\` — does the immediately upstream node output this field?
2. \`$('NodeName').item.json.field\` — does that node exist, and does it output that field?
3. Cross-references between nodes are consistent (field set in one node matches what's read in another)

Important n8n context:
- Manual Trigger and Schedule Trigger nodes output an empty object — they do NOT provide custom fields unless a Set node is placed after them
- YouTube video.get returns \`snippet.title\`, \`snippet.description\`, etc. — NOT \`caption\` or \`transcript\`
- Set nodes output exactly the fields defined in their assignments
- AI Agent nodes output \`{ output: string }\`
- Merge nodes combine fields from all inputs

Focus on CRITICAL issues only:
- Expressions referencing fields that clearly don't exist upstream (e.g., \`$json.transcript\` when no node produces a transcript field)
- Expressions referencing nodes that don't exist in the workflow

Do NOT fail for:
- Minor field name case differences
- Fields that might be available through n8n's built-in variables (\`$execution\`, \`$workflow\`, etc.)

Respond with pass: true if there are no critical data flow issues.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Check each expression in the workflow. Do they reference fields that exist upstream?`,
});
