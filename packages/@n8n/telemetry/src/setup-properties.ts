import { z } from 'zod/v4';

const setupVariant = z.enum(['control', 'variant']).optional();

export const setupTelemetryProperties = {
	session_id: z.string().optional(),
	variant: setupVariant,
	'$feature/118_instance_ai_setup_overhaul': setupVariant,
};
