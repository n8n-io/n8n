import { z } from 'zod';

export const skillNavigationSourceSchema = z.enum([
	'context_settings',
	'agent_picker',
	'agent_picker_discover',
	'agent_picker_manage',
	'assistant_menu',
	'assistant_artifact',
	'command_bar',
	'direct_or_unknown',
]);

export const skillAddEntryPointSchema = z.enum([
	'discover_detail',
	'skills_empty_state',
	'skills_create_menu',
	'recommended_empty_state',
	'recommended_dialog',
	'agent_picker',
	'assistant_menu',
]);

/** Request metadata only. Never stored with a skill or a source. */
export const skillTelemetryContextSchema = z.object({
	navigation_source: skillNavigationSourceSchema,
	flow_id: z.string().uuid(),
	add_entry_point: skillAddEntryPointSchema.optional(),
	catalog_skill_id: z
		.string()
		.max(200)
		.regex(/^[a-zA-Z0-9_./-]+$/)
		.optional(),
	recommended_skill_id: z.enum(['humanizer', 'cold-email', 'research']).optional(),
});

export type SkillTelemetryContext = z.infer<typeof skillTelemetryContextSchema>;
