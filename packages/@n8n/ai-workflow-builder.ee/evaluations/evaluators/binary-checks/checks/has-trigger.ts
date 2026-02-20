import { validateTrigger } from '@/validation/checks';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const hasTrigger: BinaryCheck = {
	name: 'has_trigger',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		const violations = validateTrigger(workflow, ctx.nodeTypes);
		const failed = violations.some((v) => v.name === 'workflow-has-no-trigger');
		return { pass: !failed, ...(failed ? { comment: 'Workflow has no trigger node' } : {}) };
	},
};
