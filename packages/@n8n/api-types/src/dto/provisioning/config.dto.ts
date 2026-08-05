import { z } from 'zod';

import { Z } from '../../zod-class';

export class ProvisioningConfigDto extends Z.class({
	scopesProvisionInstanceRole: z.boolean(),
	scopesProvisionProjectRoles: z.boolean(),
	scopesName: z.string(),
	scopesInstanceRoleClaimName: z.string(),
	scopesProjectsRolesClaimName: z.string(),
	scopesUseExpressionMapping: z.boolean(),
	/**
	 * Default condition: role slug (or BLOCK_ACCESS_ASSIGNMENT) applied when a
	 * login doesn't resolve to an instance role. Unset preserves legacy
	 * behavior: `global:member` fallback for expression mapping, skip for
	 * direct-claim provisioning.
	 */
	defaultInstanceRole: z.string().min(1).max(128).optional(),
}) {}

export class ProvisioningConfigPatchDto extends Z.class({
	scopesProvisionInstanceRole: z.boolean().optional().nullable(),
	scopesProvisionProjectRoles: z.boolean().optional().nullable(),
	scopesName: z.string().optional().nullable(),
	scopesInstanceRoleClaimName: z.string().optional().nullable(),
	scopesProjectsRolesClaimName: z.string().optional().nullable(),
	scopesUseExpressionMapping: z.boolean().optional().nullable(),
	defaultInstanceRole: z.string().min(1).max(128).optional().nullable(),
	deleteProjectRules: z.boolean().optional(),
}) {}

export type ProvisioningMode =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles'
	| 'expression_based';

export type ProvisioningModeFlags = Pick<
	ProvisioningConfigDto,
	'scopesProvisionInstanceRole' | 'scopesProvisionProjectRoles' | 'scopesUseExpressionMapping'
>;
