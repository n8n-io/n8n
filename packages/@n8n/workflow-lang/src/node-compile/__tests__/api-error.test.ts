import { NodeApiError } from 'n8n-workflow';
import type { INode, JsonObject } from 'n8n-workflow';
import ts from 'typescript';

import { apiError } from '../../sdk/index.ts';
import { API_ERROR_SOURCE } from '../specialise.ts';

interface Detail {
	message: string;
	description: string | undefined;
	httpCode: string | undefined;
}

type Options = { message?: string; description?: string; httpCode?: string };

const NODE: INode = {
	id: '1',
	name: 'Node',
	type: 'n8n-nodes-base.noOpProbe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const script = ts.transpileModule(`${API_ERROR_SOURCE}\nreturn __apiError;`, {
	compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiledError = new Function(script)() as (cause: unknown, options: unknown) => Error;

const detailOf = (error: object): Detail => ({
	message: String(Reflect.get(error, 'message')),
	description: (Reflect.get(error, 'description') as string | null | undefined) ?? undefined,
	httpCode: (Reflect.get(error, 'httpCode') as string | null | undefined) ?? undefined,
});

const WHATSAPP_400 = {
	body: { error: { message: 'The parameter is not valid', code: 100 } },
	headers: {},
	statusCode: 400,
};

const CAUSES: Array<[string, JsonObject, Options?]> = [
	['a full response with an error object in the body', WHATSAPP_400, {}],
	['a full response without options', { body: { error: { message: 'x' } }, statusCode: 404 }],
	['a text body', { body: 'plain text', statusCode: 503 }],
	['a status without a message of its own', { body: { detail: 'd' }, statusCode: 418 }],
	['no status and no text', { body: {}, headers: {} }],
	['a body without a message', { body: { error: { code: 100 } }, statusCode: 400 }],
	['a status text in the body', { body: { status: 'failed', message: 'm' }, statusCode: 400 }],
	['a code in the body', { body: { code: 77, error: { message: 'x' } } }],
	[
		'a message and a description as options',
		{ body: { error: { message: 'x' } }, statusCode: 400 },
		{ message: 'Given', description: 'Told' },
	],
	['a list as the body', { body: [{ message: 'a' }, { message: 'b' }], statusCode: 500 }],
	['an error object at the top', { error: { message: 'inner' }, statusCode: 401 }],
	['a status alone', { status: 402 }],
	['a code that is not a status', { code: 'E_X', body: { message: 'm' } }],
	[
		'an empty object with options',
		{},
		{ message: 'Sending failed', description: 'Why', httpCode: '500' },
	],
	['a description at the top', { description: 'Top text', statusCode: 409 }],
	['a JSON text under a message key', { error: '{"message":"packed"}', statusCode: 400 }],
];

describe('the NodeApiError of a compiled node for a cause that is plain data', () => {
	for (const [label, cause, options] of CAUSES) {
		it(`gives the message, the description and the code of v1: ${label}`, () => {
			const v1 = new NodeApiError(NODE, structuredClone(cause), options);
			expect(detailOf(compiledError(structuredClone(cause), options))).toEqual(detailOf(v1));
		});
	}

	it('keeps the form of an error with a message text', () => {
		const made = compiledError(new Error('Request failed with status code 404'), undefined);
		expect(detailOf(made)).toMatchObject({
			message: 'The resource you are requesting could not be found',
			httpCode: '404',
		});
	});
});

describe('the apiError of a library node for the same cause', () => {
	it('gives the message and the code of v1 for an object with the status as statusCode', () => {
		const v1 = new NodeApiError(NODE, structuredClone(WHATSAPP_400), {});
		const made = apiError({ status: 400, body: WHATSAPP_400.body }, { helper: 'object' });
		expect(detailOf(made)).toEqual(detailOf(v1));
	});
});
