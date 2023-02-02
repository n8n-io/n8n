import type { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import type { IDataObject, ILoadOptionsFunctions, IPairedItemData } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

/**
 * Make an authenticated API request to Bubble.
 */
export async function dropcontactApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const options: OptionsWithUri = {
		method,
		uri: `https://api.dropcontact.io${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	return this.helpers.requestWithAuthentication.call(this, 'dropcontactApi', options);
}

export function mapPairedItemsFrom<T>(iterable: Iterable<T> | ArrayLike<T>): IPairedItemData[] {
	return Array.from(iterable, (_, i) => i).map((index) => {
		return {
			item: index,
		};
	});
}
