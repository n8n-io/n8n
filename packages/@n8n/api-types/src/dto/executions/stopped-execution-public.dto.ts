import '../../openapi-extend';
import { z } from 'zod';

import { stoppedCountOpenApi, stoppedExecutionFieldDocs } from './stopped-execution-public.openapi';
import { Z } from '../../zod-class';

// Deliberately smaller than `ExecutionPublicDto`: the stop endpoint answers with the result of the
// stop, which carries no `id`. `mode` and `status` stay `z.string()` because both are varchar
// columns, and a value outside the documented enum must not turn a response into a 500.
export const stoppedExecutionPublicSchema = z.object({
	mode: z.string().openapi(stoppedExecutionFieldDocs.mode),
	startedAt: z.string().openapi(stoppedExecutionFieldDocs.startedAt),
	stoppedAt: z.string().optional().openapi(stoppedExecutionFieldDocs.stoppedAt),
	finished: z.boolean().openapi(stoppedExecutionFieldDocs.finished),
	status: z.string().openapi(stoppedExecutionFieldDocs.status),
});

export class StoppedExecutionPublicDto extends Z.class(stoppedExecutionPublicSchema.shape) {}

export const stoppedExecutionsPublicSchema = z.object({
	stopped: z.number().int().openapi(stoppedCountOpenApi),
});

export class StoppedExecutionsPublicDto extends Z.class(stoppedExecutionsPublicSchema.shape) {}
