import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus, FieldValueOption } from 'n8n-workflow';

import { ExecutionService } from '@/executions/execution.service';
import { CATALOG_RUN_USER_KEY } from '@/workflows/catalog-run.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { StartTrigger } from '@/workflows/workflow-input-schema.service';
import { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

/**
 * Upper bound on what one listing describes. Describing a workflow means
 * reading its trigger through a node context, so an instance with thousands of
 * shared workflows would otherwise pay for all of them on every request.
 */
export const CATALOG_LIST_LIMIT = 200;

export type CatalogEntry = {
	id: string;
	name: string;
	description: string | null;
	/**
	 * How the workflow is entered. Surfaced rather than kept internal: a
	 * manual-trigger workflow takes no input at all, which is otherwise
	 * indistinguishable from one whose builder simply declared no fields yet.
	 */
	trigger: StartTrigger;
	fields: FieldValueOption[];
};

export type CatalogListing = {
	workflows: CatalogEntry[];
	/** Set when the limit cut the candidate set, so the caller never reads a short list as a complete one. */
	truncated: boolean;
};

/** How many past runs one page of history returns. */
export const CATALOG_RUNS_LIMIT = 50;

export type CatalogRun = {
	id: string;
	workflowId: string;
	workflowName?: string;
	status: ExecutionStatus;
	startedAt: Date | null;
	stoppedAt?: Date;
};

export type CatalogRunListing = {
	runs: CatalogRun[];
	count: number;
	estimated: boolean;
};

@Service()
export class CatalogService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowInputSchemaService: WorkflowInputSchemaService,
		private readonly executionService: ExecutionService,
	) {}

	/**
	 * The workflows a person may run, with the input contract each declares.
	 *
	 * Deliberately returns no `nodes` or `connections`: the catalog is for people
	 * who run workflows rather than read them, and execute access must not become
	 * a way to obtain the graph.
	 */
	async list(user: User): Promise<CatalogListing> {
		const shared = await this.workflowFinderService.findAllWorkflowsForUser(user, [
			'workflow:execute',
		]);

		// The finder returns one row per share path, so a workflow reachable both
		// through project membership and a direct share arrives twice.
		const candidates = [...new Map(shared.map((wf) => [wf.id, wf])).values()];

		const truncated = candidates.length > CATALOG_LIST_LIMIT;

		if (truncated) {
			this.logger.warn('Catalog listing truncated', {
				userId: user.id,
				candidates: candidates.length,
				limit: CATALOG_LIST_LIMIT,
			});
		}

		const described = await Promise.all(
			candidates.slice(0, CATALOG_LIST_LIMIT).map(async (workflow) => {
				const schema = await this.workflowInputSchemaService.describe(workflow);

				// A workflow with no readable contract is not offerable. Left out
				// rather than shown as broken: the person browsing cannot fix it.
				if (!schema.eligible) return null;

				return {
					id: workflow.id,
					name: workflow.name,
					description: workflow.description,
					trigger: schema.trigger,
					fields: schema.fields,
				};
			}),
		);

		return {
			workflows: described.filter((entry): entry is CatalogEntry => entry !== null),
			truncated,
		};
	}

	/**
	 * A person's own catalog runs, most recent first.
	 *
	 * Scoped by the run marker rather than by workflow, so someone sharing a
	 * workflow with colleagues sees only what they themselves started.
	 */
	async listRuns(user: User): Promise<CatalogRunListing> {
		const sharingOptions = await this.executionService.buildSharingOptions('workflow:execute');

		const { results, count, estimated } = await this.executionService.findRangeWithCount({
			kind: 'range',
			user,
			sharingOptions,
			metadata: [{ key: CATALOG_RUN_USER_KEY, value: user.id, exactMatch: true }],
			range: { limit: CATALOG_RUNS_LIMIT },
			order: { startedAt: 'DESC' },
		});

		// Projected down from the execution summary on purpose: it also carries
		// `lastNodeExecuted`, per-node statuses and error details, which would
		// hand node names to someone who cannot read the workflow.
		const runs = results.map(({ id, workflowId, workflowName, status, startedAt, stoppedAt }) => ({
			id,
			workflowId,
			workflowName,
			status,
			startedAt,
			stoppedAt,
		}));

		return { runs, count, estimated };
	}
}
