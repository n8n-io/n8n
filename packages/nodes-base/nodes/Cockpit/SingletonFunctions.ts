import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions
} from 'n8n-core';
import { cockpitApiRequest } from './GenericFunctions';

export async function getSingleton(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resourceName: string): Promise<any> { // tslint:disable-line:no-any
	return cockpitApiRequest.call(this, 'get', `/singletons/get/${resourceName}`);
}
