import { z } from 'zod';

import { FORMAT_VERSION } from './constants';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	target: z.string().min(1),
});

export const manifestCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)),
});

export const manifestRequirementsSchema = z
	.object({
		credentials: z
			.array(manifestCredentialRequirementSchema)
			.optional()
			.superRefine((arr, ctx) => {
				if (!arr) return;
				const seen = new Set<string>();
				for (const c of arr) {
					if (seen.has(c.id)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Duplicate credential id: ${c.id}`,
						});
					}
					seen.add(c.id);
				}
			}),
	})
	.optional();

export const packageManifestSchema = z
	.object({
		packageFormatVersion: z.literal(FORMAT_VERSION),
		exportedAt: z.string().datetime(),
		sourceN8nVersion: z.string().min(1),
		sourceId: z.string().min(1),
		workflows: z.array(manifestEntrySchema).optional(),
		requirements: manifestRequirementsSchema,
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
export type ManifestCredentialRequirement = z.infer<typeof manifestCredentialRequirementSchema>;
export type ManifestRequirements = z.infer<typeof manifestRequirementsSchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
