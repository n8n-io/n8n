import { z } from 'zod';
import { Z } from 'zod-class';

export class ManualRunQueryDto extends Z.class({
	partialExecutionVersion: z
		.enum(['1', '2'])
		.default('1')
		.transform((version) => Number.parseInt(version) as 1 | 2),
}) {}
