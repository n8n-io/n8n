import { hasNonPositionalChanges } from 'n8n-workflow';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

const GATE_TAG_NAME = 'requires_changes_in_workflow';

export const workflowActuallyChanged: BinaryCheck = {
	name: 'workflow_actually_changed',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (!ctx.existingWorkflow) {
			return { pass: true, comment: 'There is no existing workflow, skipped' };
		}
		const tags: string[] = (ctx.annotations?.tags as []) ?? [];
		if (!tags.includes(GATE_TAG_NAME)) {
			return { pass: true, comment: 'Code did not require changes in previous workflow' };
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
