import { z } from 'zod';

export const manifestEntrySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	target: z.string().min(1),
});

export const packageManifestSchema = z.object({
	packageFormatVersion: z.string().min(1),
	exportedAt: z.string().min(1),
	sourceN8nVersion: z.string().min(1),
	sourceId: z.string().min(1),
	workflows: z.array(manifestEntrySchema).optional(),
});

export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type PackageManifest = z.infer<typeof packageManifestSchema>;
