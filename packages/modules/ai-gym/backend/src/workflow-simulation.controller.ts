import { Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Request } from 'express';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import { MissingWorkflowCredentialsError } from './errors/missing-workflow-credentials.error';
import { UnsupportedWorkflowNodesError } from './errors/unsupported-workflow-nodes.error';
import type { AiGymSeedPayload } from './types';
import { AiGymExecutionHostPort } from './types';
import { WorkflowSimulationService } from './workflow-simulation.service';

interface SimulateWorkflowRequestBody {
	startNode?: string;
	destinationNode?: string;
	pinData?: IWorkflowBase['pinData'];
	seeds?: Record<string, AiGymSeedPayload | AiGymSeedPayload[]>;
	faults?: Record<string, number>;
	timeoutMs?: number;
	workflowData?: Pick<
		IWorkflowBase,
		'nodes' | 'connections' | 'pinData' | 'settings' | 'staticData'
	>;
}

interface CheckSupportRequestBody {
	nodes?: INode[];
}

interface AuthenticatedUserRequest extends Request {
	user: { id: string };
	body: SimulateWorkflowRequestBody;
}

interface AuthenticatedSupportRequest extends Request {
	user: { id: string };
	body: CheckSupportRequestBody;
}

@RestController('/workflows')
export class WorkflowSimulationController {
	constructor(
		private readonly simulationService: WorkflowSimulationService,
		private readonly host: AiGymExecutionHostPort,
	) {}

	@Get('/:workflowId/simulate/support')
	@ProjectScope('workflow:read')
	async getWorkflowSupport(
		req: AuthenticatedUserRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
	) {
		const workflowData = await this.host.loadWorkflowForUser({
			workflowId,
			userId: req.user.id,
		});
		if (!workflowData) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}
		const [support, capabilities] = await Promise.all([
			this.simulationService.checkSupport(workflowData),
			this.simulationService.getCapabilities(),
		]);
		return {
			...support,
			availableVendors: capabilities.vendors,
		};
	}

	@Post('/:workflowId/simulate/support')
	@ProjectScope('workflow:read')
	async checkDraftWorkflowSupport(
		req: AuthenticatedSupportRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
	) {
		const nodes = Array.isArray(req.body?.nodes) ? req.body.nodes : undefined;
		let targetNodes = nodes;
		if (!targetNodes) {
			const workflowData = await this.host.loadWorkflowForUser({
				workflowId,
				userId: req.user.id,
			});
			if (!workflowData) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
			}
			targetNodes = workflowData.nodes;
		}
		const [support, capabilities] = await Promise.all([
			this.simulationService.checkSupport({ nodes: targetNodes }),
			this.simulationService.getCapabilities(),
		]);
		return {
			...support,
			availableVendors: capabilities.vendors,
		};
	}

	@Post('/:workflowId/simulate')
	@ProjectScope('workflow:execute')
	async simulateWorkflow(
		req: AuthenticatedUserRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
	) {
		const body = req.body ?? {};
		const savedWorkflow = await this.host.loadWorkflowForUser({
			workflowId,
			userId: req.user.id,
		});
		if (!savedWorkflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		// Allow simulating unsaved canvas edits while still anchoring to an existing authorized workflow.
		const workflowData: IWorkflowBase = body.workflowData
			? {
					...savedWorkflow,
					nodes: body.workflowData.nodes ?? savedWorkflow.nodes,
					connections: body.workflowData.connections ?? savedWorkflow.connections,
					pinData: body.workflowData.pinData ?? savedWorkflow.pinData,
					settings: body.workflowData.settings ?? savedWorkflow.settings,
					staticData: body.workflowData.staticData ?? savedWorkflow.staticData,
				}
			: savedWorkflow;

		const pushRefHeader = req.headers['push-ref'];
		const pushRef = typeof pushRefHeader === 'string' ? pushRefHeader : undefined;

		try {
			return await this.simulationService.simulate({
				workflowData,
				startNode: body.startNode,
				destinationNode: body.destinationNode,
				pinData: body.pinData,
				seeds: body.seeds,
				faults: body.faults,
				timeoutMs: body.timeoutMs,
				pushRef,
				userId: req.user.id,
			});
		} catch (error) {
			if (
				error instanceof UnsupportedWorkflowNodesError ||
				error instanceof MissingWorkflowCredentialsError
			) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}
}
