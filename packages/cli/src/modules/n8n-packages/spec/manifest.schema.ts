import { z } from 'zod';

import { FORMAT_VERSION } from './constants';
import { packageRequirementsSchema } from './requirements.schema';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	target: z.string().min(1),
});

type ManifestEntryInput = z.infer<typeof manifestEntrySchema>;

function assertNoDuplicateIds(
	items: Array<Pick<ManifestEntryInput, 'id'>> | undefined,
	ctx: z.RefinementCtx,
): void {
	if (!items) return;

	const seenIds = new Set<string>();
	for (const item of items) {
		if (seenIds.has(item.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate id in manifest: ${item.id}`,
			});
		}
		seenIds.add(item.id);
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
		assertNoDuplicateIds(manifest.workflows, ctx);
		assertNoDuplicateIds(manifest.projects, ctx);
		assertNoDuplicateIds(manifest.credentials, ctx);
	});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
