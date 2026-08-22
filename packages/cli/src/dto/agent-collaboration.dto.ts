import { z } from 'zod';

/**
 * DTO for joining an agent collaboration session
 */
export const JoinAgentSessionDto = z.object({
	userName: z.string().optional(),
});

export type JoinAgentSessionDto = z.infer<typeof JoinAgentSessionDto>;

/**
 * DTO for updating cursor position
 */
export const UpdateCursorDto = z.object({
	x: z.number(),
	y: z.number(),
});

export type UpdateCursorDto = z.infer<typeof UpdateCursorDto>;