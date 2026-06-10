import { z } from 'zod';

export const packageCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

export const packageRequirementsSchema = z.object({
	credentials: z
		.array(packageCredentialRequirementSchema)
		.optional()
		.superRefine((credentials, ctx) => {
			if (!credentials) return;
			const seen = new Set<string>();
			for (const credential of credentials) {
				if (seen.has(credential.id)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Duplicate credential id: ${credential.id}`,
					});
				}
				seen.add(credential.id);
			}
		}),
});

export type PackageCredentialRequirement = z.infer<typeof packageCredentialRequirementSchema>;
export type PackageRequirements = z.infer<typeof packageRequirementsSchema>;
