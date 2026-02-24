import { z } from 'zod';

export const ExecutionRedactionQueryDtoSchema = z
	.object({
		redactExecutionData: z.boolean().optional(),
	})
	.passthrough();
export type ExecutionRedactionQueryDto = z.output<typeof ExecutionRedactionQueryDtoSchema>;
