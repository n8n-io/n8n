import { Router, type RequestHandler, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';

import { toExecutionSnapshot } from './workflow-executions.handlers';
import { jsonValueSchema } from '../../common';
import {
	ExecutionNotFoundError,
	ResumeRejectedError,
	type ExecutionQueryService,
	type ResumeRejection,
	type ResumeRequestService,
} from '../../execution';
import { MAX_SLOT_INDEX } from '../../graph';
import type { ResolveStepResponse, ResumeTargetResponse } from '../api.types';
import { fail } from '../error-response';

const IdParams = z.object({ id: z.string().uuid() });

const ResumeTargetBody = z.object({ token: z.string().min(1) }).strict();

const ResolveStepBody = z
	.object({
		token: z.string().min(1),
		outputs: z.array(jsonValueSchema).max(MAX_SLOT_INDEX + 1),
	})
	.strict();

const REJECTION_STATUS: Record<ResumeRejection, number> = {
	invalid_token: 401,
	not_found: 404,
	not_waiting: 409,
	ambiguous: 409,
};

const notConfigured: RequestHandler = (_req, res) => {
	fail(res, 501, { error: 'unimplemented', reason: 'This engine accepts no resume requests.' });
};

/** `true` once the refusal is sent. Returns `false` for any other error, and the caller rethrows it. */
function sendRejection(res: Response, error: unknown): boolean {
	if (!(error instanceof ResumeRejectedError)) return false;
	fail(res, REJECTION_STATUS[error.code], { error: error.code });
	return true;
}

/** `POST /workflow-executions/:id/resume-target`: phase one of a resume request. */
export function createResumeTargetHandler(
	resumeRequests: ResumeRequestService | undefined,
	executionQuery: ExecutionQueryService,
): RequestHandler {
	if (!resumeRequests) return notConfigured;

	return async (req, res) => {
		const params = IdParams.safeParse(req.params);
		const body = ResumeTargetBody.safeParse(req.body);
		if (!params.success || !body.success) {
			fail(res, 400, { error: 'invalid_request' });
			return;
		}

		try {
			const target = await resumeRequests.locate(params.data.id, body.data.token);
			// Read after the token check, so a bad token learns nothing about the
			// execution. The response carries every step, because the resume method
			// can resolve expressions against earlier outputs.
			const execution = await executionQuery.getExecutionWithSteps(params.data.id);
			const response: ResumeTargetResponse = {
				execution: toExecutionSnapshot(execution),
				target,
			};
			res.status(200).json(response);
		} catch (error) {
			if (error instanceof ExecutionNotFoundError) {
				fail(res, 404, { error: 'not_found' });
				return;
			}
			if (!sendRejection(res, error)) throw error;
		}
	};
}

/** `POST /step-executions/:id/resolve`: phase two of a resume request. */
export function createStepExecutionsRouter(
	resumeRequests: ResumeRequestService | undefined,
): RouterType {
	const router = Router();

	if (!resumeRequests) {
		router.post('/:id/resolve', notConfigured);
		return router;
	}

	router.post('/:id/resolve', async (req, res) => {
		const params = IdParams.safeParse(req.params);
		const body = ResolveStepBody.safeParse(req.body);
		if (!params.success || !body.success) {
			fail(res, 400, { error: 'invalid_request' });
			return;
		}

		try {
			const step = await resumeRequests.resolve(params.data.id, body.data.token, body.data.outputs);
			const response: ResolveStepResponse = { executionId: step.executionId, stepId: step.id };
			res.status(200).json(response);
		} catch (error) {
			if (!sendRejection(res, error)) throw error;
		}
	});

	return router;
}
