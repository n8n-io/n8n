import { validateConnections } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const vectorStoreHasEmbeddings: BinaryCheck = {
	name: 'vector_store_has_embeddings',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateConnections(workflow, ctx.nodeTypes);
		const failed = violations.some(
			(v) =>
				v.name === 'node-missing-required-input' &&
				v.metadata?.missingType === 'ai_embedding' &&
				v.metadata?.nodeType?.includes('vectorStore'),
		);
		return {
			pass: !failed,
			...(failed ? { comment: 'Vector store node missing required embeddings connection' } : {}),
		};
	},
};
