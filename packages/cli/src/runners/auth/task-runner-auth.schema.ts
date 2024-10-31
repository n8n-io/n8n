import { z } from 'zod';

export const taskRunnerAuthRequestBodySchema = z.object({
	token: z.string().min(1),
});
