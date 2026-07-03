import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/** A workflow that can be attached to an agent as a `type: "workflow"` tool. */
export interface AttachableWorkflow {
	name: string;
	active: boolean;
	triggerType: string;
}

// Keys are dotted n8n node type IDs; the naming-convention rule doesn't apply.
/* eslint-disable @typescript-eslint/naming-convention */
const SUPPORTED_TRIGGERS: Record<string, string> = {
	'n8n-nodes-base.manualTrigger': 'manual',
	'n8n-nodes-base.executeWorkflowTrigger': 'executeWorkflow',
	'n8n-nodes-base.chatTrigger': 'chat',
	'n8n-nodes-base.scheduleTrigger': 'schedule',
	'n8n-nodes-base.formTrigger': 'form',
};

/**
 * Lists the workflows a user may attach to an agent as `type: "workflow"` tools.
 * Shared by the CLI agent-builder tool and the instance-ai adapter so the trigger
 * policy lives in one place — and, critically, it goes through
 * `WorkflowFinderService` so results are scoped to the user's `workflow:read`
 * access instead of leaking every workflow name in the project.
 */
@Service()
export class AttachableWorkflowsService {
	constructor(private readonly workflowFinderService: WorkflowFinderService) {}

	async list(user: User, projectId: string): Promise<AttachableWorkflow[]> {
		const workflows = await this.workflowFinderService.findAllWorkflowsForUser(
			user,
			['workflow:read'],
			undefined,
			projectId,
		);

		// A workflow can surface via several share paths; dedupe by id.
		const byId = new Map<string, (typeof workflows)[number]>();
		for (const workflow of workflows) {
			if (!byId.has(workflow.id)) byId.set(workflow.id, workflow);
		}

		return Array.from(byId.values())
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.flatMap((workflow) => {
				const triggerNode = (workflow.nodes ?? []).find((node) => SUPPORTED_TRIGGERS[node.type]);
				if (!triggerNode) return [];
				return [
					{
						name: workflow.name,
						active: workflow.active,
						triggerType: SUPPORTED_TRIGGERS[triggerNode.type],
					},
				];
			});
	}
}
