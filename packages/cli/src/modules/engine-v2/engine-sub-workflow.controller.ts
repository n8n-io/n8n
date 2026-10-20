import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { BadRequestError } from '@n8n/errors';

import type { ResolveSubWorkflowResponse } from './engine-sub-workflow.contract';
import { resolveSubWorkflowRequestSchema } from './engine-sub-workflow.contract';
import { EngineSubWorkflowService } from './engine-sub-workflow.service';

/**
 * Serves `POST /internal/sub-workflows/resolve` for the engine v2 data plane.
 * Validates the body and writes the response. `EngineSubWorkflowService`
 * decides access and builds the graph.
 */
@Service()
export class EngineSubWorkflowController {
	constructor(private readonly subWorkflowService: EngineSubWorkflowService) {}

	async resolveSubWorkflow(req: Request, res: Response): Promise<void> {
		const parsed = resolveSubWorkflowRequestSchema.safeParse(req.body);

		if (!parsed.success) throw new BadRequestError('Invalid sub-workflow resolve request');

		const body: ResolveSubWorkflowResponse = await this.subWorkflowService.resolve(parsed.data);
		res.status(200).json(body);
	}
}
