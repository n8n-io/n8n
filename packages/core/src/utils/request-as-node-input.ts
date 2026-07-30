import { isObjectLiteral } from '@n8n/backend-common';
import type { IDataObject } from 'n8n-workflow';

/**
 * How an incoming HTTP request looks as node input `json`: the request body, with the
 * request's own headers last so a body field cannot stand in for them.
 */
export function requestAsNodeInput(request?: {
	body?: unknown;
	headers?: unknown;
}): IDataObject {
	const { body, headers } = request ?? {};

	return {
		...(isObjectLiteral(body) ? body : {}),
		headers: isObjectLiteral(headers) ? headers : {},
	};
}
