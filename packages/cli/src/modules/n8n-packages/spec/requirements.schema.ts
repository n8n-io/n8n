import { z } from 'zod';

export const packageCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

export const packageDataTableRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	sourceProjectId: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

function assertNoDuplicateId<T extends { id: string }>(
	entries: T[] | undefined,
	label: string,
	ctx: z.RefinementCtx,
) {
	if (!entries) return;
	const seen = new Set<string>();
	for (const entry of entries) {
		if (seen.has(entry.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate ${label} id: ${entry.id}`,
			});
		}
		seen.add(entry.id);
	}
}

export const packageRequirementsSchema = z.object({
	credentials: z
		.array(packageCredentialRequirementSchema)
		.optional()
		.superRefine((credentials, ctx) => assertNoDuplicateId(credentials, 'credential', ctx)),
	dataTables: z
		.array(packageDataTableRequirementSchema)
		.optional()
		.superRefine((dataTables, ctx) => assertNoDuplicateId(dataTables, 'data table', ctx)),
});

export type PackageCredentialRequirement = z.infer<typeof packageCredentialRequirementSchema>;
export type PackageDataTableRequirement = z.infer<typeof packageDataTableRequirementSchema>;
export type PackageRequirements = z.infer<typeof packageRequirementsSchema>;
