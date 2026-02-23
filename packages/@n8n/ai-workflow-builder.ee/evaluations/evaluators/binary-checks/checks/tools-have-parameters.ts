import { validateTools } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const toolsHaveParameters: BinaryCheck = {
	name: 'tools_have_parameters',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateTools(workflow, ctx.nodeTypes);
		return {
			pass: violations.length === 0,
			...(violations.length > 0
				? { comment: violations.map((v) => v.description).join('; ') }
				: {}),
		};
	},
};
