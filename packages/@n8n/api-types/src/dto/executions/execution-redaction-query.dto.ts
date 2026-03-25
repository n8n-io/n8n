import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';

export const ExecutionRedactionQueryDtoSchema = z
	.object({
		redactExecutionData: booleanFromString.optional(),
	})
	.passthrough();

export type ExecutionRedactionQueryDto = z.output<typeof ExecutionRedactionQueryDtoSchema>;
