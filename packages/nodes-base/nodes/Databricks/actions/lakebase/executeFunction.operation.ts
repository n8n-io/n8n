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

function shapeResult(response: GenericValue): IDataObject[] {
	// Not `!response`: 0 and false are results, only a void/204 body is empty
	if (response === undefined || response === null || response === '') return [{ success: true }];
	if (Array.isArray(response)) {
		return response.map((row: GenericValue) => (isDataObject(row) ? row : { result: row }));
	}
	if (isDataObject(response)) return [response];
	return [{ result: response }];
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseFunctionUrl(this, i);
	const body = readArguments(this, i);

	const response = await lakebaseApiRequest(this, {
		method: 'POST',
		url,
		body,
		json: true,
		headers: { Accept: 'application/json' },
	});

	return shapeResult(response).map((json) => ({ json, pairedItem: { item: i } }));
}
