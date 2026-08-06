import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { FieldValueOption } from 'n8n-workflow';

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

@Service()
export class CatalogService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowInputSchemaService: WorkflowInputSchemaService,
	) {}

	/**
	 * The workflows a person may run, with the input contract each declares.
	 *
	 * Deliberately returns no `nodes` or `connections`: the catalog is for people
	 * who run workflows rather than read them, and execute access must not become
	 * a way to obtain the graph.
	 */
	async list(user: User): Promise<CatalogListing> {
		const shared = await this.workflowFinderService.findAllWorkflowsForUser(
			user,
			['workflow:execute'],
			/* folderId= */ undefined,
			/* projectId= */ undefined,
			// The catalog answers "what was I given", not "what may I administer".
			// Without this an instance owner's global execute scope turns the listing
			// into every workflow there is, other people's personal ones included.
			{ sharedWithUserOnly: true },
		);

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
}
