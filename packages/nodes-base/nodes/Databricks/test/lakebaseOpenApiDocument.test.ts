import type { IDataObject, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { isOpenApiUnavailable } from '../actions/lakebase/openApiDocument';

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const SCHEMA_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public';
const DOCUMENT_URL = `${SCHEMA_URL}/openapi.json`;

const errorWith = (data: unknown) => {
	const error = new NodeApiError(node, { message: 'failed' } as JsonObject);
	error.context.data = data as IDataObject;
	return error;
};

describe('Lakebase -> schema document availability', () => {
	it('recognises a project that serves no schema document', () => {
		expect(isOpenApiUnavailable(errorWith({ code: 'PGRST205' }), DOCUMENT_URL)).toBe(true);
	});

	it.each([
		['a missing table on a table path', { code: 'PGRST205' }, `${SCHEMA_URL}/orders`],
		['a different code on the document path', { code: '42501' }, DOCUMENT_URL],
		['no code at all', { message: 'nope' }, DOCUMENT_URL],
		['a body that is not an object', 'nope', DOCUMENT_URL],
	])('does not claim the document is off for %s', (_name, data, url) => {
		expect(isOpenApiUnavailable(errorWith(data), url)).toBe(false);
	});

	it('ignores an error that did not come from the API', () => {
		expect(isOpenApiUnavailable(new Error('socket hang up'), DOCUMENT_URL)).toBe(false);
	});
});
