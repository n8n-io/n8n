import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type {
	GenericValue,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { lakebaseApiRequest } from '../../transport';
import { resolveLakebaseFunctionUrl } from './helpers';

// `isRecord` narrows to `Record<string, unknown>`, which `INodeExecutionData.json` (IDataObject) does not accept
function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

function readArguments(context: IExecuteFunctions, i: number): IDataObject {
	if (context.getNodeParameter('specifyArguments', i, 'fields') === 'json') {
		const raw = context.getNodeParameter('argumentsJson', i, '{}');
		const parsed =
			typeof raw === 'string'
				? jsonParse<unknown>(raw, { errorMessage: 'Arguments (JSON) is not valid JSON' })
				: raw;
		if (!isDataObject(parsed)) {
			throw new NodeOperationError(context.getNode(), 'Arguments (JSON) must be a JSON object', {
				itemIndex: i,
			});
		}
		return parsed;
	}

	const raw = context.getNodeParameter('functionArguments.value', i, {});
	const value = isDataObject(raw) ? raw : {};
	// A blank optional argument means "not provided", so Postgres applies its DEFAULT.
	// Core has already rejected a required argument left blank.
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null));
}

function shapeResult(statusCode: number, body: GenericValue): IDataObject[] {
	// Only a void function (204) has no result; null, '', 0 and false are results
	if (statusCode === 204 || body === undefined) return [{ success: true }];
	if (Array.isArray(body)) {
		return body.map((row: GenericValue) => (isDataObject(row) ? row : { result: row }));
	}
	if (isDataObject(body)) return [body];
	return [{ result: body }];
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseFunctionUrl(this, i);
	const body = readArguments(this, i);

	const response: { statusCode: number; body: GenericValue } = await lakebaseApiRequest(this, {
		method: 'POST',
		url,
		body,
		json: true,
		returnFullResponse: true,
		headers: { Accept: 'application/json' },
	});

	return shapeResult(response.statusCode, response.body).map((json) => ({
		json,
		pairedItem: { item: i },
	}));
}
