import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';
import { ICollection } from './CollectionInterface';
import { cockpitApiRequest } from './GenericFunctions';

export async function saveCollectionEntry(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resourceName: string, data: IDataObject, id?: string): Promise<any> { // tslint:disable-line:no-any
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

export async function getCollectionEntries(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resourceName: string, additionalFields: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const body: ICollection = {};

	if (additionalFields.fields) {
		body.fields = JSON.parse(additionalFields.fields.toString());
	}

	if (additionalFields.filter) {
		body.filter = JSON.parse(additionalFields.filter.toString());
	}

	if (additionalFields.limit) {
		body.limit = additionalFields.limit as number;
	}

	if (additionalFields.skip) {
		body.skip = additionalFields.skip as number;
	}

	if (additionalFields.sort) {
		body.sort = JSON.parse(additionalFields.sort.toString());
	}

	if (additionalFields.populate) {
		body.populate = additionalFields.populate as boolean;
	}

	if (additionalFields.simple) {
		body.simple = additionalFields.simple as boolean;
	}

	if (additionalFields.language) {
		body.lang = additionalFields.language as string;
	}

	return cockpitApiRequest.call(this, 'post', `/collections/get/${resourceName}`, body);
}
