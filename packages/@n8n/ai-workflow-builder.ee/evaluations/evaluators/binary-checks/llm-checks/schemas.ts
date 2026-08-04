import { z } from 'zod';

export const binaryJudgeResultSchema = z.object({
	reasoning: z
		.string()
		.describe('Step-by-step analysis. Write this FIRST, BEFORE deciding pass/fail.'),
	pass: z
		.boolean()
		.describe(
			'Final verdict derived from the reasoning above. true = all criteria met, false = at least one issue found.',
		),
});

export type BinaryJudgeResult = z.infer<typeof binaryJudgeResultSchema>;
