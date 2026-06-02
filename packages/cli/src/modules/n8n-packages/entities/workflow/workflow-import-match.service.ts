import { type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

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
			// A workflow authored on this instance (never imported) has no
			// `sourceWorkflowId`, so fall back to its own id: re-importing a package
			// exported from here matches the originals by their original id.
			const key = workflow.sourceWorkflowId ?? workflow.id;

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

		throw new ConflictError('AMBIGUOUS_SOURCE_WORKFLOW_ID', undefined, {
			code: 'AMBIGUOUS_SOURCE_WORKFLOW_ID',
			ambiguous,
		});
	}
}
