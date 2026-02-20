import { validateConnections } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const agentHasLanguageModel: BinaryCheck = {
	name: 'agent_has_language_model',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateConnections(workflow, ctx.nodeTypes);
		const failed = violations.some(
			(v) =>
				v.name === 'node-missing-required-input' &&
				v.metadata?.missingType === 'ai_languageModel' &&
				v.metadata?.nodeType?.includes('langchain.agent'),
		);
		return {
			pass: !failed,
			...(failed ? { comment: 'Agent node missing required language model connection' } : {}),
		};
	},
};
