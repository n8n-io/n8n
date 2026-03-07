import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import type { Request } from 'express';
import type { IConnections, INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { transpileWorkflowJS, parseWorkflowCode, COMPILER_EXAMPLES } from '@n8n/workflow-sdk';

import { ActiveExecutions } from '@/active-executions';
import { OwnershipService } from '@/services/ownership.service';
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
		private readonly ownershipService: OwnershipService,
	) {}

	@Post('/parse-code', { skipAuth: true })
	async parseCode(req: Request) {
		const { code } = req.body as { code: string };
		const transpiled = transpileWorkflowJS(code);
		if (transpiled.errors.length > 0) {
			return {
				workflow: { id: 'compiled', name: 'Error', nodes: [], connections: {} },
				errors: transpiled.errors,
			};
		}
		try {
			const workflow = parseWorkflowCode(transpiled.code);
			return { workflow, errors: [] };
		} catch (e) {
			return {
				workflow: { id: 'compiled', name: 'Error', nodes: [], connections: {} },
				errors: [{ message: e instanceof Error ? e.message : 'Failed to generate workflow JSON' }],
			};
		}
	}

	@Get('/examples', { skipAuth: true })
	async getExamples() {
		return COMPILER_EXAMPLES;
	}

	@Post('/execute-workflow', { skipAuth: true })
	async executeWorkflow(req: Request) {
		const { workflow } = req.body as { workflow: PlaygroundWorkflowJSON };

		// Use instance owner for DB operations (playground skips auth)
		const owner = await this.ownershipService.getInstanceOwner();

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

		// Link to owner's personal project
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(owner.id);
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
			userId: owner.id,
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
