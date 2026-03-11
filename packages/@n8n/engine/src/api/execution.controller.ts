import { Router } from 'express';
import type { Request, Response } from 'express';

import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { ExecutionStatus } from '../database/enums';
import type { AppDependencies } from './server';

export function createExecutionRouter(deps: AppDependencies): Router {
	const router = Router();
	const { dataSource, engineService, broadcaster } = deps;

	// POST /api/workflow-executions - Start execution
	router.post('/', async (req: Request, res: Response) => {
		try {
			const { workflowId, triggerData, mode, version } = req.body as {
				workflowId: string;
				triggerData?: unknown;
				mode?: string;
				version?: number;
			};

			if (!workflowId) {
				res.status(400).json({ error: 'workflowId is required' });
				return;
			}

			const executionId = await engineService.startExecution(
				workflowId,
				triggerData,
				mode ?? 'production',
				version,
			);

			res.status(201).json({
				executionId,
				status: 'running',
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflow-executions - List executions
	router.get('/', async (req: Request, res: Response) => {
		try {
			const { workflowId, status } = req.query as {
				workflowId?: string;
				status?: string;
			};

			const queryBuilder = dataSource.getRepository(WorkflowExecution).createQueryBuilder('we');

			if (workflowId) {
				queryBuilder.andWhere('we.workflowId = :workflowId', { workflowId });
			}

			if (status) {
				queryBuilder.andWhere('we.status = :status', { status });
			}

			queryBuilder.orderBy('we.createdAt', 'DESC');

			const executions = await queryBuilder.getMany();

			res.status(200).json(
				executions.map((e) => ({
					id: e.id,
					workflowId: e.workflowId,
					workflowVersion: e.workflowVersion,
					status: e.status,
					mode: e.mode,
					cancelRequested: e.cancelRequested,
					pauseRequested: e.pauseRequested,
					startedAt: e.startedAt,
					completedAt: e.completedAt,
					durationMs: e.durationMs,
					computeMs: e.computeMs,
					waitMs: e.waitMs,
					createdAt: e.createdAt,
				})),
			);
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflow-executions/:id/steps - Get all step executions
	// Must be registered before /:id to avoid matching 'steps' as an id
	router.get('/:id/steps', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const steps = await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder('wse')
				.where('wse.executionId = :id', { id })
				.orderBy('wse.createdAt', 'ASC')
				.getMany();

			res.status(200).json(
				steps.map((s) => ({
					id: s.id,
					executionId: s.executionId,
					stepId: s.stepId,
					stepType: s.stepType,
					status: s.status,
					input: s.input,
					output: s.output,
					error: s.error,
					attempt: s.attempt,
					parentStepExecutionId: s.parentStepExecutionId,
					startedAt: s.startedAt,
					completedAt: s.completedAt,
					durationMs: s.durationMs,
				})),
			);
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflow-executions/:id/stream - SSE event stream
	router.get('/:id/stream', (req: Request, res: Response) => {
		const { id } = req.params;
		broadcaster.subscribe(id, res);
	});

	// POST /api/workflow-executions/:id/cancel - Cancel execution
	router.post('/:id/cancel', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const execution = await dataSource.getRepository(WorkflowExecution).findOneBy({ id });

			if (!execution) {
				res.status(404).json({ error: 'Execution not found' });
				return;
			}

			await engineService.cancelExecution(id);

			// Re-fetch to return the updated status
			const updated = await dataSource.getRepository(WorkflowExecution).findOneByOrFail({ id });

			res.status(200).json({
				id,
				status: updated.status,
				cancelRequested: updated.cancelRequested,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflow-executions/:id/pause - Pause execution
	router.post('/:id/pause', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { resumeAfter } = (req.body ?? {}) as { resumeAfter?: string };

			const execution = await dataSource.getRepository(WorkflowExecution).findOneBy({ id });

			if (!execution) {
				res.status(404).json({ error: 'Execution not found' });
				return;
			}

			if (execution.status !== ExecutionStatus.Running) {
				res.status(409).json({ error: 'Execution is not running' });
				return;
			}

			const resumeAfterDate = resumeAfter ? new Date(resumeAfter) : undefined;

			await engineService.pauseExecution(id, resumeAfterDate);

			res.status(200).json({
				status: 'paused',
				resumeAfter: resumeAfterDate?.toISOString() ?? null,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflow-executions/:id/resume - Resume execution
	router.post('/:id/resume', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const execution = await dataSource.getRepository(WorkflowExecution).findOneBy({ id });

			if (!execution) {
				res.status(404).json({ error: 'Execution not found' });
				return;
			}

			await engineService.resumeExecution(id);

			res.status(200).json({
				id,
				status: 'running',
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflow-executions/:id - Get execution
	router.get('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const execution = await dataSource.getRepository(WorkflowExecution).findOneBy({ id });

			if (!execution) {
				res.status(404).json({ error: 'Execution not found' });
				return;
			}

			res.status(200).json({
				id: execution.id,
				workflowId: execution.workflowId,
				workflowVersion: execution.workflowVersion,
				status: execution.status,
				result: execution.result,
				error: execution.error,
				cancelRequested: execution.cancelRequested,
				pauseRequested: execution.pauseRequested,
				resumeAfter: execution.resumeAfter?.toISOString() ?? null,
				startedAt: execution.startedAt,
				completedAt: execution.completedAt,
				durationMs: execution.durationMs,
				computeMs: execution.computeMs,
				waitMs: execution.waitMs,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// DELETE /api/workflow-executions/:id - Delete execution (cascade to steps)
	router.delete('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const execution = await dataSource.getRepository(WorkflowExecution).findOneBy({ id });

			if (!execution) {
				res.status(404).json({ error: 'Execution not found' });
				return;
			}

			// Delete step executions first (cascade is defined on entity but
			// explicit delete is clearer for this API layer)
			await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder()
				.delete()
				.from(WorkflowStepExecution)
				.where('executionId = :id', { id })
				.execute();

			await dataSource
				.getRepository(WorkflowExecution)
				.createQueryBuilder()
				.delete()
				.from(WorkflowExecution)
				.where('id = :id', { id })
				.execute();

			res.status(200).json({ id, deleted: true });
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	return router;
}
