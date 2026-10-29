import { instanceContextInjectionSchema, instanceContextReachSchema } from '@n8n/api-types';
import { z } from 'zod';

/** Keep the original context summary and earlier reads when a suspended run restarts. */
export const suspendedInstanceContextSchema = z.object({
	injection: instanceContextInjectionSchema,
	instanceContextEnabled: z.boolean(),
	nodeUsageEnabled: z.boolean(),
	reachSoFar: instanceContextReachSchema,
});

export type SuspendedInstanceContext = z.infer<typeof suspendedInstanceContextSchema>;
