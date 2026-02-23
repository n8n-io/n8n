import { validateParameters } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const validRequiredParameters: BinaryCheck = {
	name: 'valid_required_parameters',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateParameters(workflow, ctx.nodeTypes);
		const missing = violations.filter((v) => v.name === 'node-missing-required-parameter');
		return {
			pass: missing.length === 0,
			...(missing.length > 0 ? { comment: missing.map((v) => v.description).join('; ') } : {}),
		};
	},
};
