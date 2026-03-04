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
	CODING_GUIDELINES,
	DESIGN_GUIDANCE,
} from '@n8n/ai-workflow-builder';

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
