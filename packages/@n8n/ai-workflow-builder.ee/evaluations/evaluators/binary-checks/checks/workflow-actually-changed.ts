import { hasNonPositionalChanges } from 'n8n-workflow';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const workflowActuallyChanged: BinaryCheck = {
	name: 'workflow_actually_changed',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (!ctx.existingWorkflow) {
			return { pass: true, comment: 'There is no existing workflow, skipped' };
		}

		const changed = hasNonPositionalChanges(
			ctx.existingWorkflow.nodes,
			workflow.nodes,
			ctx.existingWorkflow.connections,
			workflow.connections,
		);

		if (changed) return { pass: true };
		return {
			pass: false,
			comment: 'Nothing has changed in the workflow',
		};
	},
};
