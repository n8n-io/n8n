import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { BadRequestError } from '@n8n/errors';

import type { ResolveWorkflowResponse } from './engine-workflow-resolve.contract';
import { resolveWorkflowRequestSchema } from './engine-workflow-resolve.contract';
import { EngineWorkflowResolveService } from './engine-workflow-resolve.service';

/** Serves `POST /internal/workflows/resolve` for the engine v2 data plane. */
@Service()
export class EngineWorkflowResolveController {
	constructor(private readonly workflowResolveService: EngineWorkflowResolveService) {}

	async resolveWorkflow(req: Request, res: Response): Promise<void> {
		const parsed = resolveWorkflowRequestSchema.safeParse(req.body);

		if (!parsed.success) throw new BadRequestError('Invalid workflow resolve request');

		const body: ResolveWorkflowResponse = await this.workflowResolveService.resolve(parsed.data);
		res.status(200).json(body);
	}
}
