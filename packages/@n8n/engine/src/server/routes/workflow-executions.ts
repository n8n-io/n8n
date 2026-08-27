import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import {
	createGetExecutionHandler,
	createGetExecutionStepsHandler,
} from './workflow-executions.handlers';
import { AdmittanceRejectedError } from '../../admittance';
import { UnimplementedError, type JsonValue } from '../../common';
import { GraphValidationError, MAX_SLOT_INDEX } from '../../graph';
import type { EngineServerDeps } from '../create-engine-server';
import { fail } from '../error-response';

const MAX_TRIGGER_SLOTS = MAX_SLOT_INDEX + 1;

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
	/** Trigger output slots. Empty means "no payload" — send `null` or omit instead. */
	triggerOutputs: z.array(jsonValueSchema).min(1).max(MAX_TRIGGER_SLOTS).nullable().optional(),
	mode: z.enum(['production', 'manual']).optional(),
});

export function createWorkflowExecutionsRouter(deps: EngineServerDeps): RouterType {
	const router = Router();

	router.post('/', async (req, res) => {
		const parsed = StartExecutionBody.safeParse(req.body);
		if (!parsed.success) {
			fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
			return;
		}

		try {
			const result = await deps.startExecution.start(parsed.data);
			res.status(201).json(result);
		} catch (error) {
			if (error instanceof AdmittanceRejectedError) {
				fail(res, 429, { error: 'admittance_rejected', reason: error.reason });
				return;
			}
			if (error instanceof GraphValidationError) {
				fail(res, 400, { error: 'invalid_graph', reason: error.message });
				return;
			}
			if (error instanceof UnimplementedError) {
				fail(res, 501, { error: 'unimplemented', reason: error.message });
				return;
			}
			throw error;
		}
	});

	router.get('/:id', createGetExecutionHandler(deps.executionQuery));

	router.get('/:id/steps', createGetExecutionStepsHandler(deps.executionQuery));

	return router;
}
