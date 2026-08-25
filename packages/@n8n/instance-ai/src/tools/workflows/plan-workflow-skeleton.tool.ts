/**
 * Plan Workflow Skeleton Tool
 *
 * Optional deterministic pre-check between node research and the parameter
 * fill: the agent commits to a topology-only skeleton (nodes, connections,
 * groups — no parameters) and gets every structural problem back at once —
 * useful while a plan still needs user approval. `fill-workflow-parameters`
 * runs the same validation internally, so the normal build path may skip this
 * tool and call the fill directly.
 */
import { Tool } from '@n8n/agents';

import { validateSkeleton } from './validate-skeleton.service';
import {
	planWorkflowSkeletonResultSchema,
	workflowSkeletonSchema,
	type PlanWorkflowSkeletonResult,
	type WorkflowSkeleton,
} from './workflow-skeleton.schema';
import type { InstanceAiContext } from '../../types';

export function createPlanWorkflowSkeletonTool(context: InstanceAiContext) {
	return new Tool('plan-workflow-skeleton')
		.description(
			'Validate a topology-only workflow skeleton (nodes, connections, optional groups — no parameters) ' +
				'before committing to a build. Deterministic and instant; returns all structural problems at once: ' +
				'unknown node types, missing trigger, unwired IF branches, missing required inputs (e.g. an AI ' +
				'Agent without a chat model), invalid groups. Also returns the resolved typeVersion per node. ' +
				'Optional pre-check: fill-workflow-parameters validates the same skeleton internally, so call ' +
				'this only when you want structural feedback before the fill (e.g. while presenting a plan).',
		)
		.input(workflowSkeletonSchema)
		.output(planWorkflowSkeletonResultSchema)
		.handler(async (skeleton: WorkflowSkeleton): Promise<PlanWorkflowSkeletonResult> => {
			const result = await validateSkeleton(context, skeleton);
			return {
				...result,
				nextStep: result.valid
					? 'Skeleton is valid. Do NOT hand-write the workflow source: call fill-workflow-parameters ' +
						'now with this exact skeleton, a concrete brief, and per-node hints.'
					: 'Fix every error diagnostic, then call fill-workflow-parameters with the corrected ' +
						'skeleton (it re-validates) — or re-run this tool to check first.',
			};
		})
		.build();
}
