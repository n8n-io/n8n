import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function clockifyApiRequest(this: ILoadOptionsFunctions | IPollFunctions | IExecuteFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('clockifyApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');

	}
	const BASE_URL = 'https://api.clockify.me/api/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-Api-Key': credentials.apiKey as string,
		},
		method,
		qs,
		body,
		uri: `${BASE_URL}/${resource}`,
		json: true,
		useQuerystring: true,
	};

	try {

		return await this.helpers.request!(options);

	} catch (error) {

		let errorMessage = error.message;

		if (error.response.body && error.response.body.message) {

			errorMessage = `[${error.statusCode}] ${error.response.body.message}`;

		}

		throw new Error('Clockify Error: ' + errorMessage);
	}
}

export async function clockifyApiRequestAllItems(this: IExecuteFunctions | IPollFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query['page-size'] = 50;

	query.page = 1;

	do {
		responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);

		returnData.push.apply(returnData, responseData);

		if (query.limit && (returnData.length >= query.limit)) {

			return returnData;
		}

		query.page++;

	} while (
		responseData.length !== 0
	);

	return returnData;
}

export function computeValues(entry: { projectId: any; timeInterval: { duration: any; }; }, user: any) {
	const membership = user.memberships.find(
		(memb: any) => memb.targetId === entry.projectId
	)
	let rate = 0;
	let currency = 'EUR';
	if (membership && membership.hourlyRate && membership.hourlyRate.amount) {
		rate = membership.hourlyRate.amount / 100
		currency = membership.hourlyRate.currency
	}
	let hours = 0;
	const duration = entry && entry.timeInterval ? entry.timeInterval.duration : null
	if (duration) {
		const hoursRegResult = /(\d*)H/.exec(duration)
		const minRegResult = /(\d*)M/.exec(duration)
		const secRegResult = /(\d*)S/.exec(duration)
		const hr = hoursRegResult ? parseInt(hoursRegResult[1], 10) : 0
		const min = minRegResult ? parseInt(minRegResult[1], 10) / 60 : 0
		const sec = secRegResult
			? parseInt(secRegResult[1], 10) / 60 / 60
			: 0
		hours += Math.ceil((hr + min + sec) * 100) / 100
	}
	return { hours, rate, currency, value: hours * rate };
}

export function flatten(arr: Array<any>): Array<any> {
	return arr.reduce(function (flat, toFlatten) {
		return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
	}, []);
}
