import { z } from 'zod';

export const appNameSchema = z.string().trim().min(1).max(128);

export const appNamespaceSchema = z
	.string()
	.trim()
	.min(1)
	// max subdomain length minus length of `--preview`
	.max(54)
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
	publishedUrl: z.string().url().nullable(),
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

export const appPreviewResponseSchema = z.object({ url: z.string().url() });
export type AppPreviewResponse = z.infer<typeof appPreviewResponseSchema>;

export const appBuildResponseSchema = z.object({
	versionId: z.string().uuid(),
	status: appBuildStatusSchema,
	attempts: z.number().int().nonnegative(),
	statusUpdatedAt: z.string().datetime().nullable(),
	diagnostics: z
		.object({
			stage: z.enum(['source', 'sandbox', 'install', 'build', 'validate', 'store']),
			message: z.string(),
			log: z.string(),
		})
		.optional(),
});
export type AppBuildResponse = z.infer<typeof appBuildResponseSchema>;

export const appListSchema = z.object({
	data: z.array(appSchema),
	count: z.number().int().nonnegative(),
});
export type AppListResponse = z.infer<typeof appListSchema>;
