import { instanceContextInjectionSchema, instanceContextReachSchema } from '@n8n/api-types';
import { z } from 'zod';

const hubSkillTelemetryStateSchema = z.object({
	sequence: z.number().int().nonnegative(),
	calls: z.array(
		z.object({
			key: z.string(),
			runtimeSkillId: z.string(),
			skillId: z.string().optional(),
			kind: z.enum(['main', 'reference']),
			outcome: z.enum(['pending', 'success', 'failure']),
			reason: z
				.enum(['temporarily_unavailable', 'unavailable', 'invalid_reference', 'tool_error'])
				.optional(),
		}),
	),
	context: z.array(
		z.object({
			runtimeSkillId: z.string(),
			skillId: z.string().optional(),
			version: z.string().optional(),
			kind: z.enum(['carried', 'refreshed', 'revoked', 'unavailable']),
		}),
	),
});

export type HubSkillTelemetryState = z.infer<typeof hubSkillTelemetryStateSchema>;

/** Keep the original context summary and earlier reads when a suspended run restarts. */
export const suspendedInstanceContextSchema = z.object({
	injection: instanceContextInjectionSchema,
	instanceContextEnabled: z.boolean(),
	nodeUsageEnabled: z.boolean(),
	reachSoFar: instanceContextReachSchema,
	hubSkills: hubSkillTelemetryStateSchema.optional(),
});

export type SuspendedInstanceContext = z.infer<typeof suspendedInstanceContextSchema>;
