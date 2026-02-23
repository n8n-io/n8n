import { validateParameters } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const validOptionsValues: BinaryCheck = {
	name: 'valid_options_values',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateParameters(workflow, ctx.nodeTypes);
		const invalid = violations.filter((v) => v.name === 'node-invalid-options-value');
		return {
			pass: invalid.length === 0,
			...(invalid.length > 0 ? { comment: invalid.map((v) => v.description).join('; ') } : {}),
		};
	},
};
