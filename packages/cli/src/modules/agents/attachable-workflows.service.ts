import { SUPPORTED_WORKFLOW_TOOL_TRIGGERS } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/** A workflow that can be attached to an agent as a `type: "workflow"` tool. */
export interface AttachableWorkflow {
	id: string;
	name: string;
	/** The published agent can only call published workflows. */
	published: boolean;
	triggerType: string;
}

const SUPPORTED_TRIGGER_TYPES: readonly string[] = SUPPORTED_WORKFLOW_TOOL_TRIGGERS;

// The result is embedded in an LLM tool response, so cap it because large tenants
// can have thousands of readable workflows in a project.
const MAX_ATTACHABLE_WORKFLOWS = 10;

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

	async list(user: User, projectId: string, searchTerm = ''): Promise<AttachableWorkflow[]> {
		const { workflows } = await this.workflowFinderService.findWorkflowsForUser(
			user,
			['workflow:read'],
			{ filters: { projectId } },
		);
		const normalizedSearchTerm = searchTerm.trim().toLowerCase();

		// A workflow can surface via several share paths; dedupe by id.
		const byId = new Map<string, (typeof workflows)[number]>();
		for (const workflow of workflows) {
			if (!byId.has(workflow.id)) byId.set(workflow.id, workflow);
		}

		return Array.from(byId.values())
			.filter(
				(workflow) =>
					normalizedSearchTerm === '' || workflow.name.toLowerCase().includes(normalizedSearchTerm),
			)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.flatMap((workflow) => {
				const hasSupportedTrigger = (workflow.nodes ?? []).some((node) =>
					SUPPORTED_TRIGGER_TYPES.includes(node.type),
				);
				if (!hasSupportedTrigger) return [];
				return [
					{
						id: workflow.id,
						name: workflow.name,
						published: workflow.activeVersionId !== null,
						triggerType: 'executeWorkflow',
					},
				];
			})
			.slice(0, MAX_ATTACHABLE_WORKFLOWS);
	}
}
