import { z } from 'zod';
import { Z } from 'zod-class';

export class ProvisioningConfigDto extends Z.class({
	scopesProvisionInstanceRole: z.boolean(),
	scopesProvisionProjectRoles: z.boolean(),
	scopesName: z.string(),
	scopesInstanceRoleClaimName: z.string(),
	scopesProjectsRolesClaimName: z.string(),
}) {}

export class ProvisioningConfigPatchDto extends Z.class({
	scopesProvisionInstanceRole: z.boolean().optional().nullable(),
	scopesProvisionProjectRoles: z.boolean().optional().nullable(),
	scopesName: z.string().optional().nullable(),
	scopesInstanceRoleClaimName: z.string().optional().nullable(),
	scopesProjectsRolesClaimName: z.string().optional().nullable(),
}) {}
