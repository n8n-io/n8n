import { z } from 'zod/v4';

export const assistantSurfaceSchema = z
	.enum(['aia', 'mcp'])
	.describe('Assistant surface that acted. The settings area cannot fire this event');
