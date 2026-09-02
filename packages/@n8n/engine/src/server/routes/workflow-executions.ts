import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { AdmittanceRejectedError } from '../../admittance';
import { UnimplementedError, type JsonValue } from '../../common';
import type { StartExecutionService } from '../../execution/start-execution.service';
import { GraphValidationError } from '../../graph';

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(jsonValueSchema),
	]),
);

const jsonObjectSchema = z.record(jsonValueSchema);

const StepTypeSchema = z.enum(['trigger', 'v1-node', 'wait', 'subworkflow', 'batch']);

const GraphNodeSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: StepTypeSchema,
	config: z.unknown().optional(),
});

const GraphEdgeSchema = z.object({
	from: z.string(),
	to: z.string(),
	// Defaulted rather than optional so callers can omit the common 0/0 case while
	// the engine always sees a fully-populated edge.
	outputIndex: z.number().int().nonnegative().default(0),
	inputIndex: z.number().int().nonnegative().default(0),
	isBackEdge: z.boolean().optional(),
});

const WorkflowGraphSchema = z.object({
	nodes: z.array(GraphNodeSchema),
	edges: z.array(GraphEdgeSchema),
});

const StartExecutionBody = z.object({
	workflowId: z.string().min(1),
	graph: WorkflowGraphSchema,
	triggerPayload: jsonObjectSchema.nullable().optional(),
	mode: z.enum(['production', 'manual']).optional(),
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
			if (error instanceof GraphValidationError) {
				res.status(400).json({ error: 'invalid_graph', reason: error.message });
				return;
			}
			if (error instanceof UnimplementedError) {
				res.status(501).json({ error: 'unimplemented', reason: error.message });
				return;
			}
			throw error;
		}
	});

	return router;
}
