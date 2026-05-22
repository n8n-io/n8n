import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { mapEngineErrorToHttp } from '@/modules/query/error-mapper';
import { QueryService } from '@/modules/query/query.service';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

const runQueryBodySchema = z.object({
	query: z.string().min(1),
	timeoutMs: z.number().int().positive().optional(),
});

type RunQueryBody = z.infer<typeof runQueryBodySchema>;

type RunQueryRequest = AuthenticatedRequest<Record<string, string>, unknown, RunQueryBody>;

type QueryHandlers = {
	runQuery: PublicAPIEndpoint<RunQueryRequest>;
};

const queryHandlers: QueryHandlers = {
	runQuery: [
		publicApiScope('workflow:read'),
		async (req, res: Response) => {
			const parsed = runQueryBodySchema.safeParse(req.body);
			if (!parsed.success) {
				throw new BadRequestError(parsed.error.message);
			}

			try {
				const result = await Container.get(QueryService).run(parsed.data.query, req.user, {
					timeoutMs: parsed.data.timeoutMs,
				});
				return res.json(result);
			} catch (error) {
				throw mapEngineErrorToHttp(error);
			}
		},
	],
};

export = queryHandlers;
