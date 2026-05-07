import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import {
	AdmittanceRejectedError,
	type StartExecutionService,
} from '../../execution/start-execution.service';

const StepTypeSchema = z.enum(['trigger', 'v1-node', 'wait', 'subworkflow', 'batch']);

const GraphNodeSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: StepTypeSchema,
	config: z.unknown(),
});

const GraphEdgeSchema = z.object({
	from: z.string(),
	to: z.string(),
	outputIndex: z.number().int().nonnegative().optional(),
	isBackEdge: z.boolean().optional(),
});

const WorkflowGraphSchema = z.object({
	nodes: z.array(GraphNodeSchema),
	edges: z.array(GraphEdgeSchema),
});

const StartExecutionBody = z.object({
	workflowId: z.string().min(1),
	graph: WorkflowGraphSchema,
	triggerPayload: z.unknown().optional(),
	mode: z.enum(['production', 'manual', 'test']).optional(),
});

export function createWorkflowExecutionsRouter(startExecution: StartExecutionService): RouterType {
	const router = Router();

	router.post('/', async (req, res) => {
		const parsed = StartExecutionBody.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({
				error: 'invalid_request',
				details: parsed.error.flatten(),
			});
			return;
		}

		try {
			const result = await startExecution.start(parsed.data);
			res.status(201).json(result);
		} catch (error) {
			if (error instanceof AdmittanceRejectedError) {
				res.status(429).json({ error: 'admittance_rejected', reason: error.reason });
				return;
			}
			throw error;
		}
	});

	return router;
}
