import { z } from 'zod/v4';

const setupVariant = z.enum(['control', 'variant']).optional();

export const setupTelemetryProperties = {
	session_id: z.string().optional(),
	variant: setupVariant,
	'$feature/118_instance_ai_setup_overhaul': setupVariant,
};

// A requirement is identified by its node, kind, and credential type or parameter name.
export const setupItemProperties = {
	node_id: z.string(),
	node_type: z.string().optional(),
	kind: z.enum(['credential', 'parameter']),
	credential_type: z.string().optional(),
	parameter_name: z.string().optional(),
};
