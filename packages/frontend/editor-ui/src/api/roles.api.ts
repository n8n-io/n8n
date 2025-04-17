import type { IRestApiContext } from '@/Interface';
import type { RoleMap } from '@/types/roles.types';
import { makeRestApiRequest } from '@/utils/apiUtils';

export const getRoles = async (context: IRestApiContext): Promise<RoleMap> => {
	return await makeRestApiRequest(context, 'GET', '/roles');
};
