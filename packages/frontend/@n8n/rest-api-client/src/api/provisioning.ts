import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ProvisioningConfig {
	scopesInstanceRoleClaimName: string;
	scopesName: string;
	scopesProjectsRolesClaimName: string;
	scopesProvisionInstanceRole: boolean;
	scopesProvisionProjectRoles: boolean;
}

export const getProvisioningConfig = async (
	context: IRestApiContext,
): Promise<ProvisioningConfig> => {
	return await makeRestApiRequest(context, 'GET', '/sso/provisioning/config');
};

export const saveProvisioningConfig = async (
	context: IRestApiContext,
	config: Partial<ProvisioningConfig>,
): Promise<ProvisioningConfig> => {
	return await makeRestApiRequest(context, 'PATCH', '/sso/provisioning/config', config);
};
