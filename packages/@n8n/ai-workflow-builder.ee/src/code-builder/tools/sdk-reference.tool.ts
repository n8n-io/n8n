/**
 * SDK Reference Tool
 *
 * Returns workflow patterns and expression reference on demand,
 * avoiding the need to include them in every system prompt.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
	EXPRESSION_REFERENCE,
	ADDITIONAL_FUNCTIONS,
} from '../../shared/code-builder-and-mcp-prompt-constants';
import { WORKFLOW_PATTERNS } from '../prompts';

const SdkReferenceSchema = z.object({
	sections: z
		.array(z.enum(['patterns', 'expressions', 'functions', 'all']))
		.optional()
		.describe(
			'Which sections to return. Defaults to all. Options: patterns (workflow structure examples), expressions (expr() variable reference), functions (additional SDK functions like placeholder, sticky, onError)',
		),
});

type SdkReferenceInput = z.infer<typeof SdkReferenceSchema>;

type SectionKey = 'patterns' | 'expressions' | 'functions';

const SECTIONS: Record<SectionKey, { title: string; content: string }> = {
	patterns: { title: 'Workflow Patterns', content: WORKFLOW_PATTERNS },
	expressions: { title: 'Expression Reference', content: EXPRESSION_REFERENCE },
	functions: { title: 'Additional Functions', content: ADDITIONAL_FUNCTIONS },
};

const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export function createSdkReferenceTool() {
	return new DynamicStructuredTool({
		name: 'get_sdk_reference',
		description:
			'Get workflow SDK reference documentation including workflow patterns (linear chains, branching, parallel, loops, AI agents), expression syntax, and additional functions. MUST be called before writing workflow code.',
		schema: SdkReferenceSchema,
		func: async (input: SdkReferenceInput): Promise<string> => {
			const requested = input.sections ?? ['all'];
			const includeAll = requested.includes('all');

			const parts: string[] = [];
			for (const key of SECTION_KEYS) {
				if (includeAll || requested.includes(key)) {
					parts.push(`## ${SECTIONS[key].title}\n\n${SECTIONS[key].content}`);
				}
			}

			return parts.join('\n\n');
		},
	});
}
