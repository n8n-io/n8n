import { UUID_V7_PATTERN } from '@n8n/constants';
import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import {
	createCancelExecutionHandler,
	createFindLatestExecutionHandler,
	createGetExecutionHandler,
	createSearchExecutionsHandler,
} from './workflow-executions.handlers';
import { createResumeTargetHandler } from './resume-requests';
import { AdmittanceRejectedError } from '../../admittance';
import { jsonObjectSchema, jsonValueSchema, UnimplementedError } from '../../common';
import { GraphValidationError } from '../../graph';
import { responseExpectationSchema } from '../../response-channel';
import type { EngineServerDeps } from '../create-engine-server';
import { fail } from '../error-response';
import {
	MAX_TRIGGER_SLOTS,
	triggerOutputsSchema,
	workflowGraphSchema,
} from '../start-execution.schema';

const StartExecutionBody = z.object({
	workflowId: z.string().min(1),
	graph: workflowGraphSchema,
	/**
	 * The workflow the graph came from. Only its JSON-ness is checked: the engine
	 * stores and reports it without reading a field out of it.
	 */
	workflow: jsonObjectSchema,
	triggerOutputs: triggerOutputsSchema.nullable().optional(),
	/** Steps the caller holds the outputs of, by node id: slots like `triggerOutputs`, once per pass. */
	seededSteps: z
		.record(z.string().min(1), z.array(z.array(jsonValueSchema).max(MAX_TRIGGER_SLOTS)).min(1))
		.optional(),
	mode: z.enum(['production', 'manual']).optional(),
	// `strict`, so a misspelled key fails loudly instead of running the step
	// without the fact the caller meant to supply.
	callerContext: z
		.object({
			userId: z.string().min(1).optional(),
			projectId: z.string().min(1).optional(),
			hostMode: z.string().min(1),
		})
		.strict(),
	/** What kind of a response the caller expects. */
	responseExpectation: responseExpectationSchema.optional(),
	/** The caller mints the id. v7 only, so ids stay time-ordered. */
	executionId: z.string().regex(UUID_V7_PATTERN),
});

export function createWorkflowExecutionsRouter(deps: EngineServerDeps): RouterType {
	const router = Router();
	router.post('/search', createSearchExecutionsHandler(deps.executionQuery));
	router.post('/search/latest', createFindLatestExecutionHandler(deps.executionQuery));

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
	router.post('/:id/cancel', createCancelExecutionHandler(deps.cancelExecution));
	router.post(
		'/:id/resume-target',
		createResumeTargetHandler(deps.resumeRequests, deps.executionQuery),
	);

	return router;
}
