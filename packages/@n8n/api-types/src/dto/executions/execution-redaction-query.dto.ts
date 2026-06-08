import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';

const booleanFromStringOrBoolean = z.union([booleanFromString, z.boolean()]);

export const ExecutionRedactionQueryDtoSchema = z
	.object({
		redactExecutionData: booleanFromStringOrBoolean.optional(),
	})
	.passthrough();

export type ExecutionRedactionQueryDto = z.output<typeof ExecutionRedactionQueryDtoSchema>;
