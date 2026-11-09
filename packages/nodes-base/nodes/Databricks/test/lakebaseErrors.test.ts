import type { IHttpRequestOptions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { LAKEBASE_ERROR_HINTS, makeLakebaseErrorLegible } from '../transport/lakebaseErrors';

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiError = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

const TABLE_URL = 'https://ep.example.com/api/2.0/workspace/1/rest/db/public/orders';
const request = (url = TABLE_URL): IHttpRequestOptions => ({ method: 'GET', url });

describe('Lakebase -> error hints', () => {
	it.each([...LAKEBASE_ERROR_HINTS.keys()])('explains how to fix %s', (code) => {
		const error = apiError(400, { code, message: `the API said something about ${code}` });

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe(`the API said something about ${code}`);
		expect(error.description).toBe(LAKEBASE_ERROR_HINTS.get(code));
		expect(error.description).not.toBe(error.message);
	});

	// Descriptions are rendered through a sanitiser that deletes anything parsing
	// as a tag, so a <placeholder> would reach the user with its value removed
	it.each([...LAKEBASE_ERROR_HINTS.entries()])('keeps every word of the %s hint', (_code, hint) => {
		expect(hint).not.toMatch(/<[^\s>]+>/);
	});

	it('names the OpenAPI setting when the schema document is missing', () => {
		const error = apiError(404, { code: 'PGRST205', message: 'Could not find the table' });

		makeLakebaseErrorLegible(error, request(`${TABLE_URL}/openapi.json`));

		expect(error.description).toContain('OpenAPI specification');
	});

	it('names the table when a table read misses', () => {
		const error = apiError(404, { code: 'PGRST205', message: 'Could not find the table' });

		makeLakebaseErrorLegible(error, request());

		expect(error.description).toBe(LAKEBASE_ERROR_HINTS.get('PGRST205'));
		expect(error.description).not.toContain('OpenAPI specification');
	});

	it('delegates the workspace permission envelope', () => {
		const error = apiError(403, {
			error_code: 'PERMISSION_DENIED',
			message: 'User lacks permission',
		});

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('User lacks permission');
		expect(error.description).toContain('Grant');
	});

	it('truncates an over-long API message', () => {
		const error = apiError(400, { code: '23505', message: 'x'.repeat(900) });

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toHaveLength(500);
	});

	it('names the Data API setting when the branch has it off', () => {
		const error = apiError(503, {
			message: 'The data api is not enabled for this endpoint.',
			code: null,
			detail: null,
			hint: null,
		});

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('The data api is not enabled for this endpoint.');
		expect(error.message).not.toContain('try again');
		expect(error.description).toContain('Data API');
	});

	it('keeps the Data API hint for a 503 with no code only', () => {
		const error = apiError(503, { code: 'XX000', message: 'x' });

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('x');
		expect(error.description).toBeUndefined();
	});

	it('uses the API message as the headline for a code the map does not know', () => {
		const error = apiError(400, { code: 'P0001', message: 'bash_fail: boom', hint: null });

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('bash_fail: boom');
		expect(error.description).toBeUndefined();
	});

	it('uses the hint the function raised when the map has none', () => {
		const error = apiError(400, {
			code: 'P0001',
			message: 'bash_fail: boom',
			hint: 'call it with an id',
		});

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('bash_fail: boom');
		expect(error.description).toBe('call it with an id');
	});

	it('drops a body hint that repeats the message', () => {
		const error = apiError(400, {
			code: 'P0001',
			message: 'bash_fail: boom',
			hint: 'bash_fail: boom',
		});

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('bash_fail: boom');
		expect(error.description).toBeUndefined();
	});

	it('truncates an over-long body hint', () => {
		const error = apiError(400, { code: 'P0001', message: 'boom', hint: 'y'.repeat(900) });

		makeLakebaseErrorLegible(error, request());

		expect(error.description).toHaveLength(500);
	});

	it('flattens control characters in a body hint', () => {
		const error = apiError(400, { code: 'P0001', message: 'boom', hint: 'line one\nline two' });

		makeLakebaseErrorLegible(error, request());

		expect(error.description).toBe('line one line two');
	});

	it('prefers the map hint over the body hint', () => {
		const error = apiError(400, { code: '23505', message: 'duplicate key', hint: 'ignored' });

		makeLakebaseErrorLegible(error, request());

		expect(error.description).toBe(LAKEBASE_ERROR_HINTS.get('23505'));
	});

	it('uses the API message as the headline when there is no code', () => {
		const error = apiError(400, { message: 'bash_fail: boom', code: null });

		makeLakebaseErrorLegible(error, request());

		expect(error.message).toBe('bash_fail: boom');
		expect(error.description).toBeUndefined();
	});

	it('leaves a message-less unknown code alone', () => {
		const error = apiError(400, { code: 'PGRST999' });
		const before = { message: error.message, description: error.description };

		makeLakebaseErrorLegible(error, request());

		expect({ message: error.message, description: error.description }).toEqual(before);
	});

	it.each([
		['a string body', 'not json'],
		['a buffer body', Buffer.from('not json')],
		['no body', undefined],
	])('leaves the error alone for %s', (_name, data) => {
		const error = apiError(400, data);
		const before = { message: error.message, description: error.description };

		expect(() => makeLakebaseErrorLegible(error, request())).not.toThrow();
		expect({ message: error.message, description: error.description }).toEqual(before);
	});

	it('ignores an error that did not come from the API', () => {
		const error = new Error('socket hang up');

		expect(() => makeLakebaseErrorLegible(error, request())).not.toThrow();
	});
});
