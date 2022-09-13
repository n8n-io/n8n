import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

import moment from 'moment-timezone';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri: string | null = null,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		qsStringifyOptions: {
			arrayFormat: 'repeat',
		},
		uri: uri || `https://firestore.googleapis.com/v1/projects${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(
			this,
			'googleFirebaseCloudFirestoreOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri: string | null = null,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '');

	return returnData;
}

const isValidDate = (str: string) =>
	moment(str, ['YYYY-MM-DD HH:mm:ss Z', moment.ISO_8601], true).isValid();

// Both functions below were taken from Stack Overflow jsonToDocument was fixed as it was unable to handle null values correctly
// https://stackoverflow.com/questions/62246410/how-to-convert-a-firestore-document-to-plain-json-and-vice-versa
// Great thanks to https://stackoverflow.com/users/3915246/mahindar
export function jsonToDocument(value: string | number | IDataObject | IDataObject[]): IDataObject {
	if (value === 'true' || value === 'false' || typeof value === 'boolean') {
		return { booleanValue: value };
	} else if (value === null) {
		return { nullValue: null };
	} else if (!isNaN(value as number)) {
		if (value.toString().indexOf('.') !== -1) {
			return { doubleValue: value };
		} else {
			return { integerValue: value };
		}
	} else if (isValidDate(value as string)) {
		const date = new Date(Date.parse(value as string));
		return { timestampValue: date.toISOString() };
	} else if (typeof value === 'string') {
		return { stringValue: value };
	} else if (value && value.constructor === Array) {
		return { arrayValue: { values: value.map((v) => jsonToDocument(v)) } };
	} else if (typeof value === 'object') {
		const obj = {};
		for (const o of Object.keys(value)) {
			//@ts-ignore
			obj[o] = jsonToDocument(value[o]);
		}
		return { mapValue: { fields: obj } };
	}

	return {};
}

export function fullDocumentToJson(data: IDataObject): IDataObject {
	if (data === undefined) {
		return data;
	}

	return {
		_name: data.name,
		_id: data.id,
		_createTime: data.createTime,
		_updateTime: data.updateTime,
		...documentToJson(data.fields as IDataObject),
	};
}

export function documentToJson(fields: IDataObject): IDataObject {
	if (fields === undefined) return {};
	const result = {};
	for (const f of Object.keys(fields)) {
		const key = f,
			value = fields[f],
			isDocumentType = [
				'stringValue',
				'booleanValue',
				'doubleValue',
				'integerValue',
				'timestampValue',
				'mapValue',
				'arrayValue',
				'nullValue',
				'geoPointValue',
			].find((t) => t === key);
		if (isDocumentType) {
			const item = [
				'stringValue',
				'booleanValue',
				'doubleValue',
				'integerValue',
				'timestampValue',
				'nullValue',
				'geoPointValue',
			].find((t) => t === key);
			if (item) {
				return value as IDataObject;
			} else if ('mapValue' === key) {
				//@ts-ignore
				return documentToJson(value!.fields || {});
			} else if ('arrayValue' === key) {
				// @ts-ignore
				const list = value.values as IDataObject[];
				// @ts-ignore
				return !!list ? list.map((l) => documentToJson(l)) : [];
			}
		} else {
			// @ts-ignore
			result[key] = documentToJson(value);
		}
	}
	return result;
}
