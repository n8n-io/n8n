import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import { IDataObject } from 'n8n-workflow';

export const initSsh = (context: IRestApiContext, data: IDataObject): Promise<string> => {
	return makeRestApiRequest(context, 'POST', '/environment/init-ssh', data);
};

export const initRepository = (
	context: IRestApiContext,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return makeRestApiRequest(context, 'POST', '/environment/init-repository');
};

export const sync = (context: IRestApiContext, data: IDataObject): Promise<void> => {
	return makeRestApiRequest(context, 'POST', '/environment/push', data);
};

export const getConfig = (
	context: IRestApiContext,
): Promise<{ remoteRepository: string; name: string; email: string; currentBranch: string }> => {
	return makeRestApiRequest(context, 'GET', '/environment/config');
};
