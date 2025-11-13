import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ScimTokenResponse {
	token: string;
	baseUrl: string;
}

export const getScimToken = async (context: IRestApiContext): Promise<ScimTokenResponse> => {
	return await makeRestApiRequest(context, 'GET', '/scim/token');
};

export const generateScimToken = async (context: IRestApiContext): Promise<ScimTokenResponse> => {
	return await makeRestApiRequest(context, 'POST', '/scim/token');
};

export const deleteScimToken = async (context: IRestApiContext): Promise<void> => {
	return await makeRestApiRequest(context, 'DELETE', '/scim/token');
};
