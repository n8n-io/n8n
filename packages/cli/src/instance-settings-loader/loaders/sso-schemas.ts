import { z } from 'zod';

export const SSO_PROTOCOLS = ['saml', 'oidc'] as const;
export type SsoProtocol = (typeof SSO_PROTOCOLS)[number];

export const PROVISIONING_MODES = [
	'disabled',
	'instance_role',
	'instance_and_project_roles',
] as const;

export const ssoProtocolSchema = z.object({
	ssoProtocol: z.enum(SSO_PROTOCOLS, {
		errorMap: () => ({
			message: `N8N_SSO_PROTOCOL is required when N8N_SSO_MANAGED_BY_ENV is enabled. Set it to one of: ${SSO_PROTOCOLS.join(', ')}`,
		}),
	}),
});

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
