import { OptionsWithUri } from 'request';

import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function urlScanIoApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `https://urlscan.io/api/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'urlScanIoApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function handleListing(
	this: IExecuteFunctions,
	endpoint: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData;

	qs.size = 100;

	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	do {
		responseData = await urlScanIoApiRequest.call(this, 'GET', endpoint, {}, qs);
		returnData.push(...responseData.results);

		if (!returnAll && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		if (responseData.results.length) {
			const lastResult = responseData.results[responseData.results.length - 1];
			qs.search_after = lastResult.sort;
		}
	} while (responseData.total > returnData.length);

	return returnData;
}

export const normalizeId = ({ _id, uuid, ...rest }: IDataObject) => {
	if (_id) return { scanId: _id, ...rest };
	if (uuid) return { scanId: uuid, ...rest };
	return rest;
};
