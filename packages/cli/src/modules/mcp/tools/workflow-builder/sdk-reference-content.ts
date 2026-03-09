/**
 * SDK reference content for MCP workflow builder tools.
 *
 * Imports the raw (unescaped) prompt constants from the code-builder package
 * and assembles them into structured SDK reference documentation.
 * Served both as an MCP resource and via the n8n_get_workflow_sdk_reference tool.
 */

import {
	SDK_IMPORT_STATEMENT,
	EXPRESSION_REFERENCE,
	WORKFLOW_PATTERNS,
	ADDITIONAL_FUNCTIONS,
	WORKFLOW_RULES,
} from '@n8n/ai-workflow-builder';

// NOTE: CODING_GUIDELINES and DESIGN_GUIDANCE are MCP-only constants defined
// below. They are NOT shared with the code-builder agent (which has its own
// inline copy in its step-by-step prompt).

const CODING_GUIDELINES = `Rules:
- Use exact parameter names and structures from the type definitions.
- Use unique variable names — never reuse builder function names (e.g. \`node\`, \`trigger\`) as variable names
- Use descriptive node names (Good: "Fetch Weather Data", "Check Temperature"; Bad: "HTTP Request", "Set", "If")
- Credentials: \`credentials: { slackApi: newCredential('Slack Bot') }\` — type must match what the node expects
- Expressions: use \`expr()\` for any \`{{ }}\` syntax  — always use single or double quotes, NOT backtick template literals
  - e.g. \`expr('Hello {{ $json.name }}')\` or \`expr("{{ $('Node').item.json.field }}")\`
  - For multiline expressions, use string concatenation: \`expr('Line 1\\n' + 'Line 2 {{ $json.value }}')\`
  - WRONG: \`expr('Daily Digest - ' + $now.toFormat('MMMM d') + '\\n' + $json.output)\` — $now and $json are outside {{ }}
  - CORRECT: \`expr('Daily Digest - {{ $now.toFormat("MMMM d") }}\\n{{ $json.output }}')\` — variables inside {{ }}
  - WRONG: \`expr('{{ ' + JSON.stringify($('Node').all().map(i => i.json)) + ' }}')\` — $() used as JavaScript
  - CORRECT: \`expr('{{ $("Node").all().map(i => i.json) }}')\` — $() inside {{ }} evaluated at runtime
- Placeholders: use \`placeholder('hint')\` directly as the parameter value, not inside \`expr()\`, objects, or arrays, etc.
- Every node MUST have an \`output\` property with sample data — following nodes depend on it for expressions
- String quoting: When a string value contains an apostrophe, use double quotes for that string.
  Example: \`output: [{{ text: "I've arrived" }}]\`
- Do NOT add or edit comments. Comments are ignored and not shared with user. Use sticky(...) to provide guidance.`;

const DESIGN_GUIDANCE = `Design guidance:
- **Trace item counts**: For each connection A → B, if A returns N items, should B run N times or just once? If B doesn't need A's items (e.g., it fetches from an independent source), either set \`executeOnce: true\` on B or use parallel branches + Merge to combine results.
- **Handling convergence after branches**: When a node receives data from multiple paths (after Switch, IF, Merge): use optional chaining \`expr('{{ $json.data?.approved ?? $json.status }}')\`, reference a node that ALWAYS runs \`expr("{{ $('Webhook').item.json.field }}")\`, or normalize data before convergence with Set nodes.
- **Prefer dedicated integration nodes** over HTTP Request when search results show one is available.
- **Pay attention to @builderHint annotations** in the type definitions — they provide critical guidance on how to correctly configure node parameters.`;

/**
 * Section keys for filtered SDK reference content
 */
export type SdkReferenceSection =
	| 'patterns'
	| 'expressions'
	| 'functions'
	| 'rules'
	| 'import'
	| 'guidelines'
	| 'design'
	| 'all';

const SDK_IMPORT_SECTION = `## SDK Import Statement\n\n\`\`\`javascript\n${SDK_IMPORT_STATEMENT}\n\`\`\``;

const CODING_GUIDELINES_SECTION = `## Coding Guidelines\n\n${CODING_GUIDELINES}`;

const DESIGN_GUIDANCE_SECTION = `## Design Guidance\n\n${DESIGN_GUIDANCE}`;

const SECTIONS: Record<Exclude<SdkReferenceSection, 'all'>, string> = {
	import: SDK_IMPORT_SECTION,
	patterns: WORKFLOW_PATTERNS,
	expressions: EXPRESSION_REFERENCE,
	functions: ADDITIONAL_FUNCTIONS,
	rules: WORKFLOW_RULES,
	guidelines: CODING_GUIDELINES_SECTION,
	design: DESIGN_GUIDANCE_SECTION,
};

/**
 * Get the full SDK reference content or a filtered section.
 */
export function getSdkReferenceContent(section?: SdkReferenceSection): string {
	if (section && section !== 'all' && section in SECTIONS) {
		return SECTIONS[section];
	}

	return [
		'# n8n Workflow SDK Reference',
		'',
		SECTIONS.import,
		'',
		SECTIONS.patterns,
		'',
		SECTIONS.expressions,
		'',
		SECTIONS.functions,
		'',
		SECTIONS.rules,
		'',
		SECTIONS.guidelines,
		'',
		SECTIONS.design,
	].join('\n');
}
