import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import {
	ExecutionNotFoundError,
	type ExecutionQueryService,
	type ExecutionView,
	type StepView,
} from '../../execution';
import type { ExecutionSnapshot, ExecutionStepsResponse, StepDetail } from '../api.types';
import { fail } from '../error-response';

const ExecutionIdParams = z.object({ id: z.string().uuid() });

/** The validated `:id`, or `null` once the 400 has been sent. */
function parseExecutionId(req: Request, res: Response): string | null {
	const parsed = ExecutionIdParams.safeParse(req.params);
	if (parsed.success) return parsed.data.id;
	fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
	return null;
}

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

export function createGetExecutionHandler(executionQuery: ExecutionQueryService): RequestHandler {
	return async (req, res) => {
		const id = parseExecutionId(req, res);
		if (id === null) return;

		try {
			const execution = await executionQuery.getExecution(id);
			res.status(200).json(toExecutionSnapshot(execution));
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) {
				fail(res, 404, { error: 'not_found' });
				return;
			}
			throw error;
		}
	};
}

export function createGetExecutionStepsHandler(
	executionQuery: ExecutionQueryService,
): RequestHandler {
	return async (req, res) => {
		const id = parseExecutionId(req, res);
		if (id === null) return;

		const steps = await executionQuery.getSteps(id);
		const body: ExecutionStepsResponse = { steps: steps.map(toStepDetail) };
		res.status(200).json(body);
	};
}
