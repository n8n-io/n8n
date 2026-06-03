import { z } from 'zod';

import { FORMAT_VERSION } from './constants';
import { packageRequirementsSchema } from './requirements.schema';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	target: z.string().min(1),
});

export const packageManifestSchema = z
	.object({
		packageFormatVersion: z.literal(FORMAT_VERSION),
		exportedAt: z.string().datetime(),
		sourceN8nVersion: z.string().min(1),
		sourceId: z.string().min(1),
		workflows: z.array(manifestEntrySchema).optional(),
		credentials: z.array(manifestEntrySchema).optional(),
		requirements: packageRequirementsSchema.optional(),
	})
	.superRefine((manifest, ctx) => {
		if (!manifest.workflows) return;
		const seen = new Set<string>();
		for (const entry of manifest.workflows) {
			if (seen.has(entry.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate workflow id in manifest: ${entry.id}`,
				});
			}
			seen.add(entry.id);
		}
	});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
