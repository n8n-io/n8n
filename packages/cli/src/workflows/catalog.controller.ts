import { CatalogRunDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { IDataObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CatalogRunService } from '@/workflows/catalog-run.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

type WorkflowParam = { workflowId: string };

/**
 * Running a workflow you were given access to, without opening the editor.
 *
 * `@ProjectScope` resolves workflow → project from `:workflowId` and rejects
 * before the handler, so someone with execute but not read never reaches it —
 * which is the point: the catalog is for people who run workflows, not build
 * them, and it never hands out the graph.
 */
@RestController('/catalog/workflows')
export class CatalogController {
	constructor(
		private readonly catalogRunService: CatalogRunService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	@Post('/:workflowId/run')
	@ProjectScope('workflow:execute')
	async run(req: AuthenticatedRequest<WorkflowParam>, _res: unknown, @Body payload: CatalogRunDto) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			req.params.workflowId,
			req.user,
			['workflow:execute'],
		);

		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		return await this.catalogRunService.run(
			workflow,
			req.user,
			(payload.inputs ?? {}) as IDataObject,
		);
	}
}
