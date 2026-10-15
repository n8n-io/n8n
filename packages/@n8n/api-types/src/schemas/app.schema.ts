import { z } from 'zod';

export const appNameSchema = z.string().trim().min(1).max(128);

export const appNamespaceSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(
		/^[a-z0-9]+(-[a-z0-9]+)*$/,
		'Use lowercase letters, numbers, and single hyphens between them.',
	);

export const appVisibilitySchema = z.enum(['public', 'project', 'instance']);
export type AppVisibility = z.infer<typeof appVisibilitySchema>;

export const appBuildStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed']);
export type AppBuildStatus = z.infer<typeof appBuildStatusSchema>;

export const appSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string(),
	name: appNameSchema,
	namespace: appNamespaceSchema,
	visibility: appVisibilitySchema,
	draftVersionId: z.string().uuid().nullable(),
	publishedVersionId: z.string().uuid().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type AppResponse = z.infer<typeof appSchema>;

export const appVersionSchema = z.object({
	id: z.string().uuid(),
	appId: appSchema.shape.id,
	label: z.string().max(255).nullable(),
	sourceArtifactId: z.number().int().positive(),
	bundleArtifactId: z.number().int().positive().nullable(),
	buildStatus: appBuildStatusSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type AppVersionResponse = z.infer<typeof appVersionSchema>;

export const appListSchema = z.object({
	data: z.array(appSchema),
	count: z.number().int().nonnegative(),
});
export type AppListResponse = z.infer<typeof appListSchema>;
