import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { cockpitApiRequest } from './GenericFunctions';

export async function getSingleton(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resourceName: string,
): Promise<any> {
	return await cockpitApiRequest.call(this, 'GET', `/singletons/get/${resourceName}`);
}

export async function getAllSingletonNames(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string[]> {
	return await cockpitApiRequest.call(this, 'GET', '/singletons/listSingletons', {});
}
