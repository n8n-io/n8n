import { validateFromAi } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const noInvalidFromAi: BinaryCheck = {
	name: 'no_invalid_from_ai',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateFromAi(workflow, ctx.nodeTypes);
		return {
			pass: violations.length === 0,
			...(violations.length > 0
				? { comment: violations.map((v) => v.description).join('; ') }
				: {}),
		};
	},
};
