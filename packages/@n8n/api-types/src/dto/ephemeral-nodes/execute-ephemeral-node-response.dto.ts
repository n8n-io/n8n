import { z } from 'zod';

export const executeEphemeralNodeResponseSchema = z.object({
	status: z.enum(['success', 'error']),
	data: z.array(z.unknown()),
	error: z.string().optional(),
});

export type ExecuteEphemeralNodeResponse = z.infer<typeof executeEphemeralNodeResponseSchema>;
