import { type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class WorkflowImportMatchService {
	constructor(private readonly workflowFinderService: WorkflowFinderService) {}

	async findBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
	): Promise<Map<string, WorkflowEntity>> {
		if (sourceWorkflowIds.length === 0) return new Map();

		const workflows = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			{ includeActiveVersion: true, includeParentFolder: true },
		);

		// Build the source-id → match map in one pass, collecting only the keys
		// that resolve to more than one workflow as collisions to reject.
		const matchBySourceWorkflowId = new Map<string, WorkflowEntity>();
		const collisionsBySourceWorkflowId = new Map<string, WorkflowEntity[]>();

		for (const workflow of workflows) {
			// The finder query filters by `sourceWorkflowId IN (...)`, so a null
			// here should never happen.
			if (!workflow.sourceWorkflowId) {
				throw new UnexpectedError(
					'Matched workflow is missing its sourceWorkflowId despite the finder query filtering on it',
					{ extra: { workflowId: workflow.id } },
				);
			}
			const key = workflow.sourceWorkflowId;

			const firstMatch = matchBySourceWorkflowId.get(key);
			if (!firstMatch) {
				matchBySourceWorkflowId.set(key, workflow);
				continue;
			}

			const collisions = collisionsBySourceWorkflowId.get(key);
			if (collisions) {
				collisions.push(workflow);
			} else {
				collisionsBySourceWorkflowId.set(key, [firstMatch, workflow]);
			}
		}

		this.rejectAmbiguousMatches(collisionsBySourceWorkflowId);

		return matchBySourceWorkflowId;
	}

	private rejectAmbiguousMatches(
		collisionsBySourceWorkflowId: Map<string, WorkflowEntity[]>,
	): void {
		if (collisionsBySourceWorkflowId.size === 0) return;

		const ambiguous = Array.from(collisionsBySourceWorkflowId.entries()).map(
			([sourceWorkflowId, matches]) => ({
				sourceWorkflowId,
				matches: matches.map(({ id, name }) => ({ id, name })),
			}),
		);

		const sourceIds = ambiguous.map(({ sourceWorkflowId }) => `"${sourceWorkflowId}"`).join(', ');
		const message =
			`Import blocked: source workflow id(s) ${sourceIds} matched multiple workflows in the ` +
			'target project. Resolve the duplicate workflows before importing.';

		throw new ConflictError(message, undefined, {
			code: 'AMBIGUOUS_SOURCE_WORKFLOW_ID',
			ambiguous,
		});
	}
}
