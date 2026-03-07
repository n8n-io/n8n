import { z } from 'zod';

// Versioned schema (V1 with all fields from RFC)
const InstanceRegistrationSchemaV1 = z
	.object({
		schemaVersion: z.literal(1),
		instanceKey: z.string(),
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

const ClusterInfoResponseSchema = z.object({
	instances: z.array(instanceRegistrationSchema),
	versionMismatch: ClusterVersionMismatchSchema.nullable(),
});

// REST API response type
export type ClusterInfoResponse = z.infer<typeof ClusterInfoResponseSchema>;
