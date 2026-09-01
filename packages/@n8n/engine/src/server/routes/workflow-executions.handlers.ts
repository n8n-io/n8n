import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import {
	ExecutionNotFoundError,
	type ExecutionQueryService,
	type ExecutionView,
	type StepView,
} from '../../execution';
import type { ExecutionSnapshot, StepDetail } from '../api.types';
import { fail } from '../error-response';

const ExecutionIdParams = z.object({ id: z.string().uuid() });

/** Strict: an ignored typo would read as an execution that ran no steps. */
const GetExecutionQuery = z.object({ includeSteps: z.enum(['true', 'false']).optional() });

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

		const query = GetExecutionQuery.safeParse(req.query);
		if (!query.success) {
			fail(res, 400, { error: 'invalid_request', details: query.error.flatten() });
			return;
		}

		let execution: ExecutionView;
		try {
			execution = await executionQuery.getExecution(id);
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) {
				fail(res, 404, { error: 'not_found' });
				return;
			}
			throw error;
		}

		const snapshot = toExecutionSnapshot(execution);

		// The steps ride along, to save the caller a second round trip.
		if (query.data.includeSteps === 'true') {
			const steps = await executionQuery.getSteps(id);
			snapshot.steps = steps.map(toStepDetail);
		}

		res.status(200).json(snapshot);
	};
}
