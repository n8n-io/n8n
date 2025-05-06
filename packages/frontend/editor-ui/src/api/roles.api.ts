import type { AllRolesMap } from '@n8n/permissions';
import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export const getRoles = async (context: IRestApiContext): Promise<AllRolesMap> => {
	return await makeRestApiRequest(context, 'GET', '/roles');
};
