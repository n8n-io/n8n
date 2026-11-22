import type { CustomActionDraft, CustomActionInput } from '@n8n/api-types';
import { UserError } from '@n8n/errors';
import { jsonParse } from 'n8n-workflow';

import { InvalidCustomActionError, validateDraft } from '../draft-validator';
import { RESERVED_INPUT_NAMES } from '../node-description.generator';

const codes = (draft: CustomActionDraft) => validateDraft(draft).map((issue) => issue.code);
const pathsOf = (draft: CustomActionDraft, code: string) =>
	validateDraft(draft)
		.filter((issue) => issue.code === code)
		.map((issue) => issue.path);

const urlInput = (name: string, key = name): CustomActionInput => ({
	name,
	displayName: name,
	type: 'string',
	required: true,
	target: 'url',
	key,
});

const bodyInput = (name: string, key = name): CustomActionInput => ({
	name,
	displayName: name,
	type: 'string',
	required: false,
	target: 'body',
	key,
});

const valid: CustomActionDraft = {
	name: 'Get invoice',
	inputs: [urlInput('invoiceId'), bodyInput('note')],
	request: {
		method: 'POST',
		url: 'https://api.x.test/v1/invoices/{invoiceId}',
		headers: { Accept: 'application/json' },
		query: { limit: '10' },
		bodyType: 'json',
		body: {},
	},
};

const withRequest = (request: Partial<CustomActionDraft['request']>): CustomActionDraft => ({
	...valid,
	request: { ...valid.request, ...request },
});
const withUrl = (url: string, inputs: CustomActionInput[] = []): CustomActionDraft => ({
	...valid,
	inputs,
	request: { ...valid.request, url },
});
const withHeader = (name: string, value: string) => withRequest({ headers: { [name]: value } });
const withBody = (body: Record<string, unknown>) => withRequest({ body });
const withInputs = (inputs: CustomActionInput[]): CustomActionDraft => ({
	...valid,
	inputs,
	request: { ...valid.request, url: '/invoices' },
});

describe('validateDraft', () => {
	it('accepts a valid draft', () => {
		expect(codes(valid)).toEqual([]);
	});

	it('accepts a relative path URL', () => {
		expect(codes(withUrl('/invoices/{invoiceId}', [urlInput('invoiceId')]))).toEqual([]);
	});

	describe('expressions', () => {
		it('rejects an expression in the URL', () => {
			expect(codes(withUrl('https://x.test/{{ $json.a }}'))).toContain('expression_not_allowed');
		});

		it('rejects a leading = in a header value', () => {
			expect(codes(withHeader('Authorization', '={{ $credentials.secretKey }}'))).toContain(
				'expression_not_allowed',
			);
		});

		it('rejects an expression nested in the body', () => {
			expect(codes(withBody({ a: { b: '{{ $env.TOKEN }}' } }))).toContain('expression_not_allowed');
		});

		it('reports the path of a nested body expression', () => {
			expect(
				pathsOf(withBody({ a: [{ b: '{{ $env.TOKEN }}' }] }), 'expression_not_allowed'),
			).toEqual(['request.body.a[0].b']);
		});

		it('rejects a leading = in the URL', () => {
			expect(codes(withUrl('=/invoices'))).toContain('expression_not_allowed');
		});

		it('rejects a leading = after whitespace', () => {
			expect(codes(withHeader('X-A', '  ={{ 1 }}'))).toContain('expression_not_allowed');
		});

		it('rejects an expression in a header name', () => {
			expect(codes(withHeader('{{ $env.X }}', 'a'))).toContain('expression_not_allowed');
		});

		it('rejects a leading = in a header name', () => {
			expect(codes(withHeader('=X', 'a'))).toContain('expression_not_allowed');
		});

		it('rejects an expression in a query value', () => {
			expect(codes(withRequest({ query: { a: '{{ 1 }}' } }))).toContain('expression_not_allowed');
		});

		it('rejects an expression in a query key', () => {
			expect(codes(withRequest({ query: { '{{ 1 }}': 'a' } }))).toContain('expression_not_allowed');
		});

		it('rejects an expression in a body key', () => {
			expect(codes(withBody({ '{{ 1 }}': 'a' }))).toContain('expression_not_allowed');
		});

		it('rejects an expression in a string input default', () => {
			const draft = withInputs([
				bodyInput('a'),
				bodyInput('b'),
				{ ...bodyInput('c'), default: '={{ $credentials.x }}' },
			]);
			expect(pathsOf(draft, 'expression_not_allowed')).toEqual(['inputs[2].default']);
		});

		it('rejects an expression in an option value', () => {
			const draft = withInputs([
				bodyInput('a'),
				bodyInput('b'),
				{
					...bodyInput('c'),
					type: 'options',
					options: [
						{ name: 'Ok', value: 'ok' },
						{ name: 'Bad', value: '{{ $env.X }}' },
					],
				},
			]);
			expect(pathsOf(draft, 'expression_not_allowed')).toEqual(['inputs[2].options[1].value']);
		});

		it('rejects an expression in an option value at index 0', () => {
			const draft = withInputs([
				bodyInput('a'),
				bodyInput('b'),
				{
					...bodyInput('c'),
					type: 'options',
					options: [{ name: 'Bad', value: '=1' }],
				},
			]);
			expect(pathsOf(draft, 'expression_not_allowed')).toEqual(['inputs[2].options[0].value']);
		});

		it('rejects an expression in an input key', () => {
			expect(codes(withInputs([bodyInput('a', '{{ 1 }}')]))).toContain('expression_not_allowed');
		});

		it('accepts a number default', () => {
			expect(codes(withInputs([{ ...bodyInput('a'), type: 'number', default: 5 }]))).toEqual([]);
		});
	});

	describe('URL', () => {
		it('rejects a placeholder without an input', () => {
			expect(codes(withUrl('/invoices/{invoiceId}', []))).toContain('unknown_placeholder');
		});

		it('rejects a URL input that is not in the URL', () => {
			expect(codes(withUrl('/invoices', [urlInput('invoiceId')]))).toContain(
				'url_input_not_in_url',
			);
		});

		it('rejects a placeholder in the host', () => {
			expect(codes(withUrl('https://{host}/v1', [urlInput('host')]))).toContain(
				'placeholder_in_host',
			);
		});

		it('rejects a placeholder in the port', () => {
			expect(codes(withUrl('https://x.test:{port}/v1', [urlInput('port')]))).toContain(
				'placeholder_in_host',
			);
		});

		it('rejects a placeholder in the scheme', () => {
			expect(codes(withUrl('{scheme}://x.test/v1', [urlInput('scheme')]))).toContain(
				'placeholder_in_host',
			);
		});

		it('rejects a URL with another scheme', () => {
			expect(codes(withUrl('ftp://x.test/a'))).toContain('invalid_url');
		});

		it('rejects a URL that is not absolute and not a path', () => {
			expect(codes(withUrl('invoices/1'))).toContain('invalid_url');
		});

		it('rejects a URL without a host', () => {
			expect(codes(withUrl('https:///a'))).toContain('invalid_url');
		});

		it.each([
			['a backslash in the authority', 'https://good.test\\@other.test/x'],
			['a backslash in the path', '/invoices\\x'],
			['a tab', 'https://api.x.test/\tv1'],
			['a line break', 'https://api.x.test/v1\n'],
			['a carriage return', '/invoices\r/x'],
			['a null character', '/invoices/\u0000'],
			['a delete character', '/invoices/\u007f'],
			['user information', 'https://user:pw@api.x.test/x'],
			['a user name', 'https://user@api.x.test/x'],
			['a URL that starts with //', '//api.x.test/x'],
		])('rejects a URL with %s', (_, url) => {
			expect(codes(withUrl(url))).toContain('invalid_url');
		});

		it('accepts an @ in the path of a relative URL and of an absolute URL', () => {
			expect(codes(withUrl('/users/@me'))).toEqual([]);
			expect(codes(withUrl('https://api.x.test/users/@me'))).toEqual([]);
		});

		it('rejects a placeholder in the URL query string', () => {
			expect(codes(withUrl('/a?x={q}', [urlInput('q')]))).toContain('invalid_url');
		});

		it('rejects a placeholder with an invalid name', () => {
			expect(codes(withUrl('/a/{Bad_Name}'))).toContain('invalid_url');
		});

		it('rejects an unmatched brace', () => {
			expect(codes(withUrl('/a/{b'))).toContain('invalid_url');
		});

		it('rejects a URL input that is not required', () => {
			const draft = withUrl('/invoices/{invoiceId}', [
				{ ...urlInput('invoiceId'), required: false },
			]);
			expect(pathsOf(draft, 'url_input_not_required')).toEqual(['inputs[0].required']);
		});

		it('rejects a URL input whose key differs from its name', () => {
			const draft = withUrl('/a/{x}', [urlInput('x', 'y')]);
			expect(codes(draft)).toEqual(
				expect.arrayContaining(['unknown_placeholder', 'url_input_not_in_url']),
			);
		});
	});

	describe('inputs', () => {
		it('rejects duplicate input names', () => {
			expect(codes(withInputs([bodyInput('a'), bodyInput('a')]))).toContain('duplicate_input_name');
		});

		it('rejects two inputs with the same target and key', () => {
			expect(codes(withInputs([bodyInput('a', 'x.y'), bodyInput('b', 'x.y')]))).toContain(
				'duplicate_target_key',
			);
		});

		it('accepts the same key for different targets', () => {
			const header: CustomActionInput = { ...bodyInput('b', 'x'), target: 'header' };
			expect(codes(withInputs([bodyInput('a', 'x'), header]))).toEqual([]);
		});

		it('rejects an input that duplicates a fixed header', () => {
			const header: CustomActionInput = { ...bodyInput('a', 'accept'), target: 'header' };
			expect(codes(withInputs([header]))).toContain('duplicate_target_key');
		});

		it('rejects an input that duplicates a fixed query key', () => {
			const query: CustomActionInput = { ...bodyInput('a', 'limit'), target: 'query' };
			expect(codes(withInputs([query]))).toContain('duplicate_target_key');
		});

		it('rejects an options input without options', () => {
			expect(codes(withInputs([{ ...bodyInput('a'), type: 'options', options: [] }]))).toContain(
				'options_missing',
			);
		});

		it('rejects an options input with undefined options', () => {
			expect(codes(withInputs([{ ...bodyInput('a'), type: 'options' }]))).toContain(
				'options_missing',
			);
		});
	});

	describe('reserved names', () => {
		it.each([
			'operation',
			'resource',
			'authentication',
			'requestOptions',
			'additionalFields',
			'customActionId',
			'customActionName',
		])('rejects the input name %s', (name) => {
			const draft = withInputs([bodyInput('a'), bodyInput(name)]);
			expect(pathsOf(draft, 'reserved_input_name')).toEqual(['inputs[1].name']);
		});

		it('uses the generator list of reserved input names', () => {
			for (const name of RESERVED_INPUT_NAMES) {
				expect(codes(withInputs([bodyInput(name)]))).toContain('reserved_input_name');
			}
		});

		it.each(['__proto__', 'constructor', 'prototype'])('rejects the body key %s', (key) => {
			// JSON.parse creates an own property for "__proto__", as a request body does.
			const body = jsonParse<Record<string, unknown>>(`{ "a": [{ "${key}": { "x": 1 } }] }`);
			expect(pathsOf(withBody(body), 'reserved_body_key')).toEqual([`request.body.a[0].${key}`]);
		});

		it('rejects a reserved key at the top level of the body', () => {
			const body = jsonParse<Record<string, unknown>>('{ "__proto__": { "polluted": true } }');
			expect(pathsOf(withBody(body), 'reserved_body_key')).toEqual(['request.body.__proto__']);
		});
	});

	describe('body', () => {
		it('rejects a body when the body type is none', () => {
			expect(codes(withRequest({ bodyType: 'none', body: { a: 1 } }))).toContain(
				'body_without_body_type',
			);
		});

		it('rejects a body input when the body type is none', () => {
			const draft = { ...withInputs([bodyInput('a')]) };
			draft.request = { ...draft.request, bodyType: 'none' };
			expect(codes(draft)).toContain('body_without_body_type');
		});
	});

	it('returns all issues, not only the first', () => {
		const draft = withUrl('ftp://x.test/{{ 1 }}', [bodyInput('a'), bodyInput('a')]);
		expect(codes(draft)).toEqual(
			expect.arrayContaining(['expression_not_allowed', 'invalid_url', 'duplicate_input_name']),
		);
	});

	it('does not throw for bad content', () => {
		expect(() => validateDraft(withUrl('}{{{'))).not.toThrow();
	});
});

describe('InvalidCustomActionError', () => {
	it('is a UserError that carries the issues', () => {
		const issues = [{ path: 'request.url', code: 'invalid_url', message: 'x' }];
		const error = new InvalidCustomActionError(issues);

		expect(error).toBeInstanceOf(UserError);
		expect(error.message).toBe('The custom action is not valid');
		expect(error.issues).toEqual(issues);
	});
});
