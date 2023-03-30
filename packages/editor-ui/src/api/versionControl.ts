import type {
	IRestApiContext,
	VersionControlBase,
	VersionControlBranches,
	VersionControlCommit,
	VersionControlConfig,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export const initSsh = (context: IRestApiContext, data: VersionControlBase): Promise<string> => {
	return makeRestApiRequest(context, 'POST', '/environment/init-ssh', data);
};

export const initRepository = (context: IRestApiContext): Promise<VersionControlBranches> => {
	return makeRestApiRequest(context, 'POST', '/environment/init-repository');
};

export const sync = (context: IRestApiContext, data: VersionControlCommit): Promise<void> => {
	return makeRestApiRequest(context, 'POST', '/environment/push', data);
};

export const getConfig = (context: IRestApiContext): Promise<VersionControlConfig> => {
	return makeRestApiRequest(context, 'GET', '/environment/config');
};

export const pull = (context: IRestApiContext): Promise<void> => {
	return makeRestApiRequest(context, 'GET', '/environment/pull');
};

export const setBranch = (context: IRestApiContext, data: { branch: string }): Promise<void> => {
	return makeRestApiRequest(context, 'POST', '/environment/set-branch', data);
};
