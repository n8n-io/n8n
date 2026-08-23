import { Z } from '@n8n/api-types';
import { z } from 'zod';

/**
 * DTO for joining an agent collaboration session
 */
export const JoinAgentSessionDtoSchema = z.object({
	userName: z.string().optional(),
});

export class JoinAgentSessionDto extends Z.class(JoinAgentSessionDtoSchema.shape) { }

/**
 * DTO for updating cursor position
 */
export const UpdateCursorDtoSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export class UpdateCursorDto extends Z.class(UpdateCursorDtoSchema.shape) { }
