/**
 * Plan Workflow Skeleton Tool
 *
 * Deterministic checkpoint between node research and SDK codegen: the agent
 * commits to a topology-only skeleton (nodes, connections, groups — no
 * parameters) and gets every structural problem back at once, before spending
 * a long generation turn on full source. The validated skeleton also pins
 * node type versions for the code that follows.
 */
import { Tool } from '@n8n/agents';

import { validateSkeleton } from './validate-skeleton.service';
import {
	validateSkeletonResultSchema,
	workflowSkeletonSchema,
	type WorkflowSkeleton,
} from './workflow-skeleton.schema';
import type { InstanceAiContext } from '../../types';

export function createPlanWorkflowSkeletonTool(context: InstanceAiContext) {
	return new Tool('plan-workflow-skeleton')
		.description(
			'Validate a topology-only workflow skeleton (nodes, connections, optional groups — no parameters) ' +
				'before writing SDK source. Deterministic and instant; returns all structural problems at once: ' +
				'unknown node types, missing trigger, unwired IF branches, missing required inputs (e.g. an AI ' +
				'Agent without a chat model), invalid groups. Also returns the resolved typeVersion per node to ' +
				'pin in the source. Call after node research, fix every error, then write the code.',
		)
		.input(workflowSkeletonSchema)
		.output(validateSkeletonResultSchema)
		.handler(async (skeleton: WorkflowSkeleton) => await validateSkeleton(context, skeleton))
		.build();
}
