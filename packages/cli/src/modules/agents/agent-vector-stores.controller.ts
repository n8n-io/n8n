import { TestAgentVectorStoreDto, type VectorStoreTestResult } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentVectorStoresService } from './agent-vector-stores.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentVectorStoresController {
	constructor(private readonly agentVectorStoresService: AgentVectorStoresService) {}

	@Post('/vector-stores/test')
	@ProjectScope('agent:update')
	async testConnection(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: TestAgentVectorStoreDto,
	): Promise<VectorStoreTestResult> {
		const { projectId } = req.params;
		return await this.agentVectorStoresService.testConnection(
			projectId,
			req.user,
			payload.vectorStore,
		);
	}
}
