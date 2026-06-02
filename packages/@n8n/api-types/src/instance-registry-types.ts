import { z } from 'zod';

// Versioned schema (V1 with all fields from RFC)
const InstanceRegistrationSchemaV1 = z
	.object({
		schemaVersion: z.literal(1),
		instanceKey: z
			.string()
			.regex(/^[a-zA-Z0-9\-_]+$/, 'instanceKey must be alphanumeric with hyphens/underscores'),
		hostId: z.string(),
		instanceType: z.enum(['main', 'worker', 'webhook']),
		instanceRole: z.enum(['leader', 'follower', 'unset']),
		version: z.string(),
		registeredAt: z.number(),
		lastSeen: z.number(),
	})
	.passthrough();

// Discriminated union for future schema versions
export const instanceRegistrationSchema = z.discriminatedUnion('schemaVersion', [
	InstanceRegistrationSchemaV1,
]);

export type InstanceRegistration = z.infer<typeof instanceRegistrationSchema>;

const ClusterVersionMismatchSchema = z.object({
	versions: z.array(
		z.object({
			version: z.string(),
			instances: z.array(
				z.object({
					instanceKey: z.string(),
					hostId: z.string(),
					instanceType: z.enum(['main', 'worker', 'webhook']),
					instanceRole: z.enum(['leader', 'follower', 'unset']),
				}),
			),
		}),
	),
});

// Version mismatch type (for REST API response)
export type ClusterVersionMismatch = z.infer<typeof ClusterVersionMismatchSchema>;

const ClusterCheckWarningSchema = z.object({
	check: z.string(),
	code: z.string(),
	message: z.string(),
	severity: z.enum(['info', 'warning', 'error']).optional(),
	context: z.record(z.string(), z.unknown()).optional(),
});

const ClusterCheckResultSchema = z.object({
	check: z.string(),
	executedAt: z.number(),
	warnings: z.array(ClusterCheckWarningSchema),
	status: z.enum(['succeeded', 'failed']),
});

export type ClusterCheckResult = z.infer<typeof ClusterCheckResultSchema>;

// Single warning raised by a cluster check (for REST API response)
export type ClusterCheckWarning = z.infer<typeof ClusterCheckWarningSchema>;

const ClusterCheckSummarySchema = z.record(z.string(), ClusterCheckResultSchema);
export type ClusterCheckSummary = z.infer<typeof ClusterCheckSummarySchema>;

const ClusterInfoResponseSchema = z.object({
	instances: z.array(instanceRegistrationSchema),
	checks: ClusterCheckSummarySchema,
});

// REST API response type
export type ClusterInfoResponse = z.infer<typeof ClusterInfoResponseSchema>;
