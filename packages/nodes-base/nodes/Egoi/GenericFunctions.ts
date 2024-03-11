import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

interface IContact {
	tags: [];
	base: IDataObject;
	extra: IDataObject[];
}

const fieldCache: {
	[key: string]: IDataObject[];
} = {};

export async function egoiApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	qs: IDataObject = {},
	_headers?: object,
): Promise<any> {
	const credentials = await this.getCredentials('egoiApi');

	const options: IRequestOptions = {
		headers: {
			accept: 'application/json',
			Apikey: `${credentials.apiKey}`,
		},
		method,
		qs,
		body,
		url: `https://api.egoiapp.com${endpoint}`,
		json: true,
	};

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getFields(this: IExecuteFunctions, listId: string) {
	if (fieldCache[listId]) {
		return fieldCache[listId];
	}
	fieldCache[listId] = await egoiApiRequest.call(this, 'GET', `/lists/${listId}/fields`);
	return fieldCache[listId];
}

export async function egoiApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

	do {
		responseData = await egoiApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		query.offset += query.count;
	} while (responseData[propertyName] && responseData[propertyName].length !== 0);

	return returnData;
}

export async function simplify(this: IExecuteFunctions, contacts: IContact[], listId: string) {
	let fields = await getFields.call(this, listId);

	fields = fields.filter((element: IDataObject) => element.type === 'extra');
	const fieldsKeyValue: IDataObject = {};
	for (const field of fields) {
		fieldsKeyValue[field.field_id as string] = field.name;
	}

	const data: IDataObject[] = [];

	for (const contact of contacts) {
		const extras = contact.extra.reduce(
			(accumulator: IDataObject, currentValue: IDataObject): any => {
				const key = fieldsKeyValue[currentValue.field_id as string] as string;
				return { [key]: currentValue.value, ...accumulator };
			},
			{},
		);
		data.push({
			...contact.base,
			...extras,
			tags: contact.tags,
		});
	}

	return data;
}
