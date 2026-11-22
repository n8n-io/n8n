import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Request } from 'express';
import type { IWorkflowBase } from 'n8n-workflow';

import { UnsupportedWorkflowNodesError } from './errors/unsupported-workflow-nodes.error';
import { AiGymExecutionHostPort } from './types';
import { WorkflowSimulationService } from './workflow-simulation.service';

interface AuthenticatedUserRequest extends Request {
	user: { id: string };
}

interface SimulateWorkflowRequestBody {
	startNode?: string;
	destinationNode?: string;
	pinData?: IWorkflowBase['pinData'];
	seeds?: Record<string, Record<string, unknown>>;
	faults?: Record<string, number>;
	timeoutMs?: number;
}

@RestController('/workflows')
export class WorkflowSimulationController {
	constructor(
		private readonly simulationService: WorkflowSimulationService,
		private readonly host: AiGymExecutionHostPort,
	) {}

	@Post('/:workflowId/simulate')
	@ProjectScope('workflow:execute')
	async simulateWorkflow(
		req: AuthenticatedUserRequest,
		@Param('workflowId') workflowId: string,
		@Body body: SimulateWorkflowRequestBody,
	) {
		const workflowData = await this.host.loadWorkflowForUser({
			workflowId,
			userId: req.user.id,
		});
		if (!workflowData) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		const pushRefHeader = req.headers['push-ref'];
		const pushRef = typeof pushRefHeader === 'string' ? pushRefHeader : undefined;

		try {
			return await this.simulationService.simulate({
				workflowData,
				startNode: body?.startNode,
				destinationNode: body?.destinationNode,
				pinData: body?.pinData,
				seeds: body?.seeds,
				faults: body?.faults,
				timeoutMs: body?.timeoutMs,
				pushRef,
				userId: req.user.id,
			});
		} catch (error) {
			if (error instanceof UnsupportedWorkflowNodesError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}
}
