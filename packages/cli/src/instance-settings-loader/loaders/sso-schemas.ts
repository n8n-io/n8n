import { z } from 'zod';

export const PROVISIONING_MODES = [
	'disabled',
	'instance_role',
	'instance_and_project_roles',
] as const;

export const provisioningSchema = z
	.object({
		ssoUserRoleProvisioning: z.enum(PROVISIONING_MODES, {
			errorMap: () => ({
				message: `N8N_SSO_USER_ROLE_PROVISIONING must be one of: ${PROVISIONING_MODES.join(', ')}`,
			}),
		}),
	})
	.transform((input) => ({
		scopesProvisionInstanceRole:
			input.ssoUserRoleProvisioning === 'instance_role' ||
			input.ssoUserRoleProvisioning === 'instance_and_project_roles',
		scopesProvisionProjectRoles: input.ssoUserRoleProvisioning === 'instance_and_project_roles',
	}));
