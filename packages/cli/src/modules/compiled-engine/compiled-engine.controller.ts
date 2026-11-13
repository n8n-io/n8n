import type { CompiledEngineCompileResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { CompiledEngineService } from './compiled-engine.service';

@RestController('/compiled-engine')
export class CompiledEngineController {
	constructor(private readonly service: CompiledEngineService) {}

	/** Converts and compiles the saved version of a workflow and returns the diagnostics. */
	@Get('/workflows/:workflowId/compile')
	@ProjectScope('workflow:read')
	async compile(
		req: AuthenticatedRequest<{ workflowId: string }>,
		_res: Response,
	): Promise<CompiledEngineCompileResponse> {
		return await this.service.compileSaved(req.params.workflowId);
	}
}
