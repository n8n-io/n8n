import { z } from 'zod';

export const binaryJudgeResultSchema = z.object({
	pass: z.boolean(),
	reasoning: z.string(),
});

export type BinaryJudgeResult = z.infer<typeof binaryJudgeResultSchema>;
