import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { DatabricksApiCredentials } from './types';

export async function databricksApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
): Promise<unknown> {
	const { host } = await this.getCredentials<DatabricksApiCredentials>('databricksApi');

	const options: IHttpRequestOptions = {
		method,
		qs,
		url: `${host.replace(/\/$/, '')}${endpoint}`,
		json: true,
		headers: headers as Record<string, string>,
		...option,
	};

	if (Buffer.isBuffer(body)) {
		options.body = body;
	} else if (Object.keys(body).length) {
		options.body = body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'databricksApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Poll an async Databricks operation until it reaches a terminal state.
 * `getStatus` should return `{ state, data }` where `state` is compared
 * against `terminalStates`.  Throws if `state` is in `failedStates`.
 */
export async function pollUntilDone(
	this: IExecuteFunctions,
	getStatus: () => Promise<{ state: string; data: unknown }>,
	terminalStates: string[],
	failedStates: string[],
	intervalMs = 2000,
	maxWaitMs = 300_000,
): Promise<unknown> {
	const deadline = Date.now() + maxWaitMs;

	while (Date.now() < deadline) {
		const { state, data } = await getStatus();

		if (terminalStates.includes(state)) {
			if (failedStates.includes(state)) {
				throw new NodeApiError(this.getNode(), {
					message: `Databricks operation ended with state: ${state}`,
				} as JsonObject);
			}
			return data;
		}

		await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new NodeApiError(this.getNode(), {
		message: `Databricks operation did not complete within ${maxWaitMs / 1000}s`,
	} as JsonObject);
}

/**
 * Convert a SQL result (manifest + data_array) into an array of row objects.
 */
export function sqlResultToObjects(
	columns: Array<{ name: string }>,
	dataArray: unknown[][],
): IDataObject[] {
	return dataArray.map((row) => {
		const obj: IDataObject = {};
		columns.forEach((col, idx) => {
			obj[col.name] = row[idx] as IDataObject;
		});
		return obj;
	});
}
