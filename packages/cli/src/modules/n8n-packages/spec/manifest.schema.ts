import path from 'node:path';
import { z } from 'zod';

import { FORMAT_VERSION } from './constants';
import { packageRequirementsSchema } from './requirements.schema';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	// Scope filters compare prefixes before readers resolve paths.
	// Canonical targets keep both steps consistent for every entity type.
	target: z
		.string()
		.min(1)
		.refine(
			(target) =>
				!path.win32.isAbsolute(target) &&
				!target.includes('\\') &&
				target.split('/').every((segment) => !['', '.', '..'].includes(segment)),
			'Package target must be a canonical relative path',
		),
});

type ManifestEntryList = Array<z.infer<typeof manifestEntrySchema>>;

function assertNoDuplicateIds(
	entries: ManifestEntryList | undefined,
	label: string,
	ctx: z.RefinementCtx,
) {
	if (!entries) return;
	const seen = new Set<string>();
	for (const entry of entries) {
		if (seen.has(entry.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate ${label} id in manifest: ${entry.id}`,
			});
		}
		seen.add(entry.id);
	}
}

export const packageManifestSchema = z
	.object({
		packageFormatVersion: z.literal(FORMAT_VERSION),
		exportedAt: z.string().datetime(),
		sourceN8nVersion: z.string().min(1),
		sourceId: z.string().min(1),
		workflows: z.array(manifestEntrySchema).optional(),
		folders: z.array(manifestEntrySchema).optional(),
		projects: z.array(manifestEntrySchema).optional(),
		credentials: z.array(manifestEntrySchema).optional(),
		dataTables: z.array(manifestEntrySchema).optional(),
		variables: z.array(manifestEntrySchema).optional(),
		tags: z.array(manifestEntrySchema).optional(),
		requirements: packageRequirementsSchema.optional(),
	})
	.superRefine((manifest, ctx) => {
		assertNoDuplicateIds(manifest.workflows, 'workflow', ctx);
		assertNoDuplicateIds(manifest.folders, 'folder', ctx);
		assertNoDuplicateIds(manifest.projects, 'project', ctx);
		assertNoDuplicateIds(manifest.credentials, 'credential', ctx);
		assertNoDuplicateIds(manifest.dataTables, 'data table', ctx);
		assertNoDuplicateIds(manifest.variables, 'variable', ctx);
		assertNoDuplicateIds(manifest.tags, 'tag', ctx);
	});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
