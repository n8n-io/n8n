import { Get, Post, RootLevelController, Param } from '@n8n/decorators';
import { ScenarioExecutionEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';
import { DataSource, Repository } from '@n8n/typeorm';

@Service()
class ScenarioExecutionService {
	private repo: Repository<ScenarioExecutionEntity>;

	constructor(dataSource: DataSource) {
		this.repo = dataSource.getRepository(ScenarioExecutionEntity);
	}

	async execute(workflowId: string, mode: 'manual' | 'trigger' | 'webhook') {
		const execution = this.repo.create({
			workflowId,
			mode,
			status: 'running',
			startedAt: new Date(),
		});
		const saved = await this.repo.save(execution);

		// Simulate workflow execution completing successfully
		saved.status = 'success';
		saved.stoppedAt = new Date();
		saved.data = { nodeOutputs: {}, completedAt: new Date().toISOString() };
		return await this.repo.save(saved);
	}

	async getById(id: number) {
		return await this.repo.findOneBy({ id });
	}

	async getByWorkflowId(workflowId: string) {
		return await this.repo.find({
			where: { workflowId },
			order: { startedAt: 'DESC' },
		});
	}
}

@RootLevelController('/scenario/executions')
export class ScenarioExecutionController {
	constructor(private readonly service: ScenarioExecutionService) {}

	/** POST /workflows/{id}/execute - Execute workflow manually */
	@Post('/workflows/:workflowId/execute', { skipAuth: true })
	async executeWorkflow(req: Request, res: Response, @Param('workflowId') workflowId: string) {
		const mode = (req.body?.mode as 'manual' | 'trigger' | 'webhook') || 'manual';
		const result = await this.service.execute(workflowId, mode);
		res.status(201).json(result);
	}

	/** GET /executions/{id} - Get execution details */
	@Get('/:id', { skipAuth: true })
	async getExecution(_req: Request, res: Response, @Param('id') id: string) {
		const execution = await this.service.getById(Number(id));
		if (!execution) {
			res.status(404).json({ message: 'Execution not found' });
			return;
		}
		res.json(execution);
	}

	/** GET /workflows/{id}/executions - List all executions for workflow */
	@Get('/workflows/:workflowId', { skipAuth: true })
	async getWorkflowExecutions(
		_req: Request,
		res: Response,
		@Param('workflowId') workflowId: string,
	) {
		const executions = await this.service.getByWorkflowId(workflowId);
		res.json(executions);
	}
}
