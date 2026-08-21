import { Router, type Response, type Router as RouterType } from 'express';
import assert from 'node:assert';
import { z } from 'zod';

import { AdmittanceRejectedError } from '../../admittance';
import { UnimplementedError, type JsonValue } from '../../common';
import {
	ExecutionNotFoundError,
	type ExecutionQueryService,
	type ExecutionView,
	type StepView,
} from '../../execution';
import type { StartExecutionService } from '../../execution/start-execution.service';
import { GraphValidationError, MAX_SLOT_INDEX } from '../../graph';
import type { ExecutionSnapshot, ExecutionStepsResponse, StepDetail } from '../api.types';
import type { EngineErrorResponse } from '../error-response';

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

const ExecutionIdParams = z.object({ id: z.string().uuid() });

function toExecutionSnapshot(record: ExecutionView): ExecutionSnapshot {
	return {
		id: record.id,
		workflowId: record.workflowId,
		status: record.status,
		mode: record.mode,
		graph: record.graph,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
		finishedAt: record.finishedAt?.toISOString() ?? null,
	};
}

function toStepDetail(record: StepView): StepDetail {
	return {
		id: record.id,
		nodeId: record.nodeId,
		iteration: record.iteration,
		status: record.status,
		outputs: record.outputs,
		error: record.error,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function createWorkflowExecutionsRouter(deps: {
	startExecution: StartExecutionService;
	executionQuery: ExecutionQueryService;
}): RouterType {
	const router = Router();

	const fail = (res: Response, status: number, body: EngineErrorResponse): void => {
		assert(status >= 400, `fail() sends error responses only, but got status ${status}`);
		res.status(status).json(body);
	};

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

	router.get('/:id', async (req, res) => {
		const parsed = ExecutionIdParams.safeParse(req.params);
		if (!parsed.success) {
			fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
			return;
		}

		try {
			const execution = await deps.executionQuery.getExecution(parsed.data.id);
			res.status(200).json(toExecutionSnapshot(execution));
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) {
				fail(res, 404, { error: 'not_found' });
				return;
			}
			throw error;
		}
	});

	router.get('/:id/steps', async (req, res) => {
		const parsed = ExecutionIdParams.safeParse(req.params);
		if (!parsed.success) {
			fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
			return;
		}

		const steps = await deps.executionQuery.getSteps(parsed.data.id);
		const body: ExecutionStepsResponse = { steps: steps.map(toStepDetail) };
		res.status(200).json(body);
	});

	return router;
}
