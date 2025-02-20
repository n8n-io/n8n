import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { ExecutionRequest } from '@/executions/execution.types';

const executionUpdateSchema = z.object({
	tags: z.array(z.string()).optional(),
	vote: z.enum(['up', 'down']).nullable().optional(),
});

export function validateExecutionUpdatePayload(
	payload: unknown,
): ExecutionRequest.ExecutionUpdatePayload {
	try {
		const validatedPayload = executionUpdateSchema.parse(payload);

		// Additional check to ensure that at least one property is provided
		const { tags, vote } = validatedPayload;
		if (!tags && vote === undefined) {
			throw new BadRequestError('No annotation provided');
		}

		return validatedPayload;
	} catch (e) {
		if (e instanceof z.ZodError) {
			throw new BadRequestError(e.message);
		}

		throw e;
	}
}
