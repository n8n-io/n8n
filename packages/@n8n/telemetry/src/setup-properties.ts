import { z } from 'zod/v4';

const setupVariant = z.enum(['control', 'variant']).optional();

export const setupExperimentProperties = {
	variant: setupVariant,
	'$feature/118_instance_ai_setup_overhaul': setupVariant,
};

export const setupContextProperties = {
	...setupExperimentProperties,
	workflow_id: z.string(),
	thread_id: z.string(),
	session_id: z.string().optional(),
};

export const setupConnectionProperties = {
	...setupContextProperties,
	source: z.enum(['instance_ai_setup_panel', 'instance_ai_setup_wizard']),
	credential_type: z.string(),
	method: z.enum(['oauth', 'api_key', 'gateway', 'advanced', 'existing']),
	attempt_id: z.string().optional(),
	item_id: z.string().optional(),
	node_type: z.string().optional(),
};

export const setupRequirementSchema = z.object({
	item_id: z.string(),
	kind: z.enum(['credential', 'parameter']),
	node_id: z.string(),
	node_type: z.string(),
	credential_type: z.string().optional(),
	parameter_name: z.string().optional(),
	is_complete: z.boolean(),
});
