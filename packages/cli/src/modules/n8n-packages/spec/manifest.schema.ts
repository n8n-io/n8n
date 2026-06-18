import { z } from 'zod';

import { FORMAT_VERSION } from './constants';
import { packageRequirementsSchema } from './requirements.schema';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	target: z.string().min(1),
});

type ManifestEntryInput = z.infer<typeof manifestEntrySchema>;

function assertNoDuplicateWorkflowIds(
	workflows: ManifestEntryInput[] | undefined,
	ctx: z.RefinementCtx,
): void {
	if (!workflows) return;

	const seenWorkflowIds = new Set<string>();
	for (const entry of workflows) {
		if (seenWorkflowIds.has(entry.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate workflow id in manifest: ${entry.id}`,
			});
		}
		seenWorkflowIds.add(entry.id);
	}
}

function assertNoDuplicateProjectIds(
	projects: ManifestEntryInput[] | undefined,
	ctx: z.RefinementCtx,
): void {
	if (!projects) return;

	const seenProjectIds = new Set<string>();
	for (const entry of projects) {
		if (seenProjectIds.has(entry.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate project id in manifest: ${entry.id}`,
			});
		}
		seenProjectIds.add(entry.id);
	}
}

export const packageManifestSchema = z
	.object({
		packageFormatVersion: z.literal(FORMAT_VERSION),
		exportedAt: z.string().datetime(),
		sourceN8nVersion: z.string().min(1),
		sourceId: z.string().min(1),
		workflows: z.array(manifestEntrySchema).optional(),
		projects: z.array(manifestEntrySchema).optional(),
		credentials: z.array(manifestEntrySchema).optional(),
		requirements: packageRequirementsSchema.optional(),
	})
	.superRefine((manifest, ctx) => {
		assertNoDuplicateWorkflowIds(manifest.workflows, ctx);
		assertNoDuplicateProjectIds(manifest.projects, ctx);
	});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
