import { z } from 'zod';

export const packageCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

export const packageRequirementsSchema = z.object({
	credentials: z.array(packageCredentialRequirementSchema).optional(),
});

export type PackageCredentialRequirement = z.infer<typeof packageCredentialRequirementSchema>;
export type PackageRequirements = z.infer<typeof packageRequirementsSchema>;
