import '../../openapi-extend';
import { z } from 'zod';

import { loadWorkflowOpenApi } from './retried-execution-public.openapi';
import { Z } from '../../zod-class';

export const retryExecutionPublicSchema = z.object({
	loadWorkflow: z.boolean().optional().openapi(loadWorkflowOpenApi),
});

export class RetryExecutionPublicDto extends Z.class(retryExecutionPublicSchema.shape) {}
