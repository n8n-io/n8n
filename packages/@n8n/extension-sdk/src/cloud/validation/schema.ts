import { z } from 'zod';

// Main manifest schema
export const cloudExtensionManifestSchema = z.object({
	// Identity
	name: z.string(),
	displayName: z.string().optional(),
	description: z.string().optional(),
	version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format'),

	// Compatibility
	minN8nVersion: z.string().optional(),
	maxN8nVersion: z.string().optional(),
});

export type CloudExtensionManifest = z.infer<typeof cloudExtensionManifestSchema>;
