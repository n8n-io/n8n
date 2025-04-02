import { z } from 'zod';
import { Z } from 'zod-class';

export class VariableListRequestDto extends Z.class({
	state: z.literal('empty').optional(),
}) {}
