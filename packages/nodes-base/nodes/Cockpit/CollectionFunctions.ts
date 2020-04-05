import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';
import { ICollection } from './CollectionInterface';
import { cockpitApiRequest } from './GenericFunctions';

export async function createCollectionEntry(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resourceName: string, data: IDataObject, id?: string): Promise<any> { // tslint:disable-line:no-any
	const body: ICollection = {
		data: JSON.parse(data.toString())
	};

	if (id) {
		body.data = {
			_id: id,
			...body.data
		};
	}

	return cockpitApiRequest.call(this, 'post', `/collections/save/${resourceName}`, body);
}


export async function getAllCollectionEntries(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resourceName: string, options: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const body: ICollection = {};

	if (options.fields) {
		body.fields = JSON.parse(options.fields.toString());
	}

	if (options.filter) {
		body.filter = JSON.parse(options.filter.toString());
	}

	if (options.limit) {
		body.limit = options.limit as number;
	}

	if (options.skip) {
		body.skip = options.skip as number;
	}

	if (options.sort) {
		body.sort = JSON.parse(options.sort.toString());
	}

	if (options.populate) {
		body.populate = options.populate as boolean;
	}

	if (options.simple) {
		body.simple = options.simple as boolean;
	}

	if (options.language) {
		body.lang = options.language as string;
	}

	const resultData = await cockpitApiRequest.call(this, 'post', `/collections/get/${resourceName}`, body);

	if (options.rawData === true) {
		return resultData;
	}

	return (resultData as unknown as IDataObject).entries;
}


export async function getAllCollectionNames(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions): Promise<string[]> {
	return cockpitApiRequest.call(this, 'GET', `/collections/listCollections`, {});
}