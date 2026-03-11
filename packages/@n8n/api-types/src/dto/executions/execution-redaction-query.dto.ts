import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';

export const ExecutionRedactionQueryDtoSchema = z.looseObject({
	redactExecutionData: booleanFromString.optional(),
});

export type ExecutionRedactionQueryDto = z.output<typeof ExecutionRedactionQueryDtoSchema>;
