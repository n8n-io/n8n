import { z } from 'zod';

// Feature flag configuration
export const featureFlagConfigSchema = z.object({
	name: z.string().describe('PostHog feature flag name'),
	requiredVariant: z.string().optional().describe('Required variant for activation'),
	requiredConditions: z
		.object({
			userIsTrialing: z.boolean().optional(),
			hasActiveWorkflows: z.boolean().optional(),
			userRoles: z.array(z.string()).optional(),
		})
		.optional(),
});

// Extension point configuration (supports both string and object format)
export const extensionPointConfigSchema = z.union([
	// Simple format: "ComponentName"
	z
		.string()
		.describe('Component name to render at this extension point'),
	// Advanced format: { component: "ComponentName", priority?: number }
	z.object({
		component: z.string().describe('Component name to render'),
		priority: z.number().optional().describe('Rendering priority (higher = first)'),
	}),
]);

// Extension points configuration
// Format: { "views.workflows.headerBefore": "ComponentName" | { component: "ComponentName", priority: 100 } }
export const extensionPointsSchema = z
	.record(
		z.string().describe('Extension point name (e.g., views.workflows.headerBefore)'),
		extensionPointConfigSchema,
	)
	.optional();

// Main manifest schema
export const pluginManifestSchema = z.object({
	// Identity
	name: z.string().regex(/^@n8n\/plugin-/, 'Plugin name must start with @n8n/plugin-'),
	displayName: z.string().optional(),
	description: z.string().optional(),
	version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format'),
	author: z.string().optional(),

	// Classification
	category: z.enum(['experiment', 'integration', 'feature', 'internal']),
	tags: z.array(z.string()).optional(),

	// Compatibility
	minSDKVersion: z.string().optional(),
	minN8nVersion: z.string().optional(),
	maxN8nVersion: z.string().optional(),

	// Feature flags & Experiments
	featureFlag: featureFlagConfigSchema.optional(),

	// Extension points
	extends: extensionPointsSchema.optional(),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type FeatureFlagConfig = z.infer<typeof featureFlagConfigSchema>;
export type ExtensionPointConfig = z.infer<typeof extensionPointConfigSchema>;
export type ExtensionPointsConfig = z.infer<typeof extensionPointsSchema>;
