import { z } from 'zod';
import { Z } from 'zod-class';

export class ProvisioningConfigDto extends Z.class({
	scopesProvisionInstanceRole: z.boolean(),
	scopesProvisionProjectRoles: z.boolean(),
	scopesProvisioningFrequency: z.enum(['never', 'first_login', 'every_login']),
	scopesName: z.string(),
	scopesInstanceRoleClaimName: z.string(),
	scopesProjectsRolesClaimName: z.string(),
}) {}
