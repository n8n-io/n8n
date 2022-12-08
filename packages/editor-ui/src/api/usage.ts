import { makeRestApiRequest } from '@/utils';
import { IRestApiContext, UsageState } from '@/Interface';

export const getLicense = (context: IRestApiContext): Promise<{data: UsageState['data']}> => {
	return makeRestApiRequest(context, 'GET', '/license');
};
