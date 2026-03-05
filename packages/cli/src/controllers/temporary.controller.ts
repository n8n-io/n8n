import {
	AuthenticatedRequest,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import type { Request } from 'express';
import type { IConnections, INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { transpileWorkflowJS, COMPILER_EXAMPLES } from '@n8n/workflow-sdk';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRunner } from '@/workflow-runner';

interface PlaygroundWorkflowJSON {
	name: string;
	nodes: INode[];
	connections: IConnections;
}

@RestController('/temporary')
export class TemporaryController {
	constructor(
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	@Post('/parse-code', { skipAuth: true })
	async parseCode(req: Request) {
		const { code } = req.body as { code: string };
		return transpileWorkflowJS(code);
	}

	@Get('/examples', { skipAuth: true })
	async getExamples() {
		return COMPILER_EXAMPLES;
	}

	@Post('/execute-workflow')
	async executeWorkflow(req: AuthenticatedRequest) {
		const { workflow } = req.body as { workflow: PlaygroundWorkflowJSON };

		// Find trigger node
		const triggerNode = workflow.nodes.find(
			(n) => n.type.includes('Trigger') || n.type.includes('trigger'),
		);
		if (!triggerNode) {
			throw new Error('Workflow has no trigger node');
		}

		// Save workflow to DB so execution link works
		const newWorkflow = this.workflowRepository.create({
			name: workflow.name || 'Playground Workflow',
			nodes: workflow.nodes,
			connections: workflow.connections,
			active: false,
		});
		const savedWorkflow = await this.workflowRepository.save(newWorkflow);

		// Link to user's personal project
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
			req.user.id,
		);
		await this.sharedWorkflowRepository.save(
			this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: personalProject.id,
				workflowId: savedWorkflow.id,
			}),
		);

		// Build execution data (following MCP tool pattern)
		const pinData = { [triggerNode.name]: [{ json: {} }] };

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			workflowData: savedWorkflow,
			userId: req.user.id,
			startNodes: [{ name: triggerNode.name, sourceData: null }],
			pinData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: {
					pinData,
					runData: {},
				},
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{
							node: triggerNode,
							data: { main: [pinData[triggerNode.name]] },
							source: null,
						},
					],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		};

		const executionId = await this.workflowRunner.run(runData);

		// Wait for result with 60s timeout
		const TIMEOUT_MS = 60_000;
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Execution timed out after 60s')), TIMEOUT_MS);
		});

		const result = await Promise.race([
			this.activeExecutions.getPostExecutePromise(executionId),
			timeoutPromise,
		]);

		return {
			workflowId: savedWorkflow.id,
			executionId,
			success: result?.status !== 'error',
		};
	}
}
