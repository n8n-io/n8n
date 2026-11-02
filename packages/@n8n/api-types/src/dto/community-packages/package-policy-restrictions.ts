import '../../openapi-extend';

import { z } from 'zod';

import { packagePolicyRestrictionsFieldDocs } from './community-package-public.openapi';

export const restrictedPackageTypeSchema = z.object({
	type: z.string().openapi(packagePolicyRestrictionsFieldDocs.type),
	blockedOn: z.enum(['instance', 'projects']).openapi(packagePolicyRestrictionsFieldDocs.blockedOn),
	optInAvailable: z.boolean().openapi(packagePolicyRestrictionsFieldDocs.optInAvailable),
});

export const packagePolicyRestrictionsSchema = z.object({
	nodeTypes: z
		.array(restrictedPackageTypeSchema)
		.openapi(packagePolicyRestrictionsFieldDocs.nodeTypes),
});

export type RestrictedPackageType = z.infer<typeof restrictedPackageTypeSchema>;
export type PackagePolicyRestrictions = z.infer<typeof packagePolicyRestrictionsSchema>;
