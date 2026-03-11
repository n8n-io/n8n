import { Router } from 'express';
import type { Request, Response } from 'express';

import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { StepStatus } from '../database/enums';
import type { AppDependencies } from './server';

export function createStepExecutionRouter(deps: AppDependencies): Router {
	const router = Router();
	const { dataSource, eventBus } = deps;

	// GET /api/workflow-step-executions/:id - Get step details
	router.get('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const step = await dataSource.getRepository(WorkflowStepExecution).findOneBy({ id });

			if (!step) {
				res.status(404).json({ error: 'Step execution not found' });
				return;
			}

			res.status(200).json({
				id: step.id,
				executionId: step.executionId,
				stepId: step.stepId,
				stepType: step.stepType,
				status: step.status,
				input: step.input,
				output: step.output,
				error: step.error,
				attempt: step.attempt,
				parentStepExecutionId: step.parentStepExecutionId,
				startedAt: step.startedAt,
				completedAt: step.completedAt,
				durationMs: step.durationMs,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflow-step-executions/:id/approve - Approve/decline
	router.post('/:id/approve', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { approved } = req.body as { approved: boolean };

			if (typeof approved !== 'boolean') {
				res.status(400).json({ error: 'approved (boolean) is required' });
				return;
			}

			// Atomically update only if step is in waiting_approval status
			const updateResult = await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder()
				.update(WorkflowStepExecution)
				.set({
					status: StepStatus.Completed,
					output: { approved } as unknown as Record<string, unknown>,
					completedAt: new Date(),
				})
				.where('id = :id AND status = :status', {
					id,
					status: StepStatus.WaitingApproval,
				})
				.execute();

			if (updateResult.affected === 0) {
				res.status(409).json({
					error: 'Approval already processed or step not waiting',
				});
				return;
			}

			// Load the step to get executionId and stepId for the event
			const step = await dataSource.getRepository(WorkflowStepExecution).findOneByOrFail({ id });

			// Emit step:completed event so event handlers plan next steps
			eventBus.emit({
				type: 'step:completed',
				executionId: step.executionId,
				stepId: step.stepId,
				output: { approved },
				durationMs: 0,
				parentStepExecutionId: step.parentStepExecutionId ?? undefined,
			});

			res.status(200).json({
				status: 'completed',
				output: { approved },
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	return router;
}
