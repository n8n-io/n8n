import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import {
	ExecutionNotFoundError,
	type ExecutionQueryService,
	type ExecutionView,
	type ExecutionWithStepsView,
	type StepView,
} from '../../execution';
import type { ExecutionSnapshot, StepDetail } from '../api.types';
import { fail } from '../error-response';

const ExecutionIdParams = z.object({ id: z.string().uuid() });

/**
 * `strict`, because `z.object` strips an unknown key. A misspelled flag would
 * otherwise answer 200 with no steps, which a caller cannot tell from an
 * execution that ran none.
 */
const GetExecutionQuery = z.object({ includeSteps: z.enum(['true', 'false']).optional() }).strict();

const datetimeStringWithOffset = () => z.string().datetime({ offset: true });

const ExecutionStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']);

const SearchExecutionsBody = z
	.object({
		workflowIds: z.union([z.literal('all'), z.array(z.string().min(1)).min(1).max(10_000)]),
		status: z.array(ExecutionStatusSchema).min(1).optional(),
		mode: z.string().min(1).max(32).optional(),
		createdAfter: datetimeStringWithOffset().optional(),
		createdBefore: datetimeStringWithOffset().optional(),
		before: z
			.object({ createdAt: datetimeStringWithOffset(), id: z.string().uuid() })
			.strict()
			.optional(),
		limit: z.number().int().min(1).max(100).default(20),
		includeTotal: z.boolean().optional(),
		/** Same shape the control plane's `ExecutionSummaries.Query` uses. */
		order: z
			.object({ top: ExecutionStatusSchema.optional(), startedAt: z.literal('DESC').optional() })
			.strict()
			.optional(),
	})
	.strict()
	// The cursor only walks its own `(createdAt, id)` order, so a status-first
	// sort would drop the rows that sort after the cursor row. Ask for one or the
	// other.
	.refine((body) => !(body.before && body.order?.top), {
		message: 'before cannot be combined with order.top',
		path: ['before'],
	});

export function createSearchExecutionsHandler(
	executionQuery: ExecutionQueryService,
): RequestHandler {
	return async (req, res) => {
		const parsed = SearchExecutionsBody.safeParse(req.body);
		if (!parsed.success) {
			fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
			return;
		}
		const result = await executionQuery.searchExecutions(parsed.data);
		res.status(200).json(result);
	};
}

/** The validated `:id`, or `null` once the 400 has been sent. */
function parseExecutionId(req: Request, res: Response): string | null {
	const parsed = ExecutionIdParams.safeParse(req.params);
	if (parsed.success) return parsed.data.id;
	fail(res, 400, { error: 'invalid_request', details: parsed.error.flatten() });
	return null;
}

function toExecutionSnapshot(record: ExecutionView | ExecutionWithStepsView): ExecutionSnapshot {
	return {
		id: record.id,
		workflowId: record.workflowId,
		status: record.status,
		mode: record.mode,
		graph: record.graph,
		workflow: record.workflow,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
		finishedAt: record.finishedAt?.toISOString() ?? null,
		// Absent unless the request asked for steps, which a caller cannot tell
		// from an execution that ran none.
		...('steps' in record ? { steps: record.steps.map(toStepDetail) } : {}),
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
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
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

		// The steps ride along, to save the caller a second round trip, and are read
		// in the same query so the status cannot predate them.
		let execution: ExecutionView | ExecutionWithStepsView;
		try {
			execution =
				query.data.includeSteps === 'true'
					? await executionQuery.getExecutionWithSteps(id)
					: await executionQuery.getExecution(id);
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) {
				fail(res, 404, { error: 'not_found' });
				return;
			}
			throw error;
		}

		res.status(200).json(toExecutionSnapshot(execution));
	};
}
