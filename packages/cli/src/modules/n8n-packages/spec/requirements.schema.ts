import { z } from 'zod';

export const packageCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

// Variables are keyed by name; no id travels with them in the package.
export const packageVariableRequirementSchema = z.object({
	name: z.string().min(1),
	value: z.string().optional(),
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
	variables: z
		.array(packageVariableRequirementSchema)
		.optional()
		.superRefine((variables, ctx) => {
			if (!variables) return;
			const seen = new Set<string>();
			for (const variable of variables) {
				if (seen.has(variable.name)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Duplicate variable name: ${variable.name}`,
					});
				}
				seen.add(variable.name);
			}
		}),
});

export type PackageCredentialRequirement = z.infer<typeof packageCredentialRequirementSchema>;
export type PackageVariableRequirement = z.infer<typeof packageVariableRequirementSchema>;
export type PackageRequirements = z.infer<typeof packageRequirementsSchema>;
