import { startHttpActionDraft, httpActionFormOfRequest } from './next-nodes-instance.request';

describe('httpActionFormOfRequest', () => {
	it('splits the URL, and makes an expression in it a path input', () => {
		const form = httpActionFormOfRequest({
			method: 'POST',
			url: '=https://api.acme.com/v1/users/{{ $json.userId }}/notes?format=json',
		});

		expect(form).toMatchObject({
			method: 'POST',
			baseUrl: 'https://api.acme.com',
			path: '/v1/users/{userId}/notes',
			query: [{ key: 'format', value: 'json', fromInput: false }],
		});
	});

	it('names an input that no field gives after its place', () => {
		const form = httpActionFormOfRequest({ url: '=https://acme.com/{{ $now.toISO() }}' });
		expect(form.path).toBe('/{value1}');
	});

	it('keeps fixed values, and makes an expression value an input of the same name', () => {
		const form = httpActionFormOfRequest({
			url: 'https://api.acme.com/greet',
			sendQuery: true,
			queryParameters: {
				parameters: [
					{ name: 'name', value: '={{ $json.name }}' },
					{ name: 'lang', value: 'de' },
				],
			},
			sendHeaders: true,
			headerParameters: {
				parameters: [
					{ name: 'Accept', value: 'application/json' },
					{ name: 'X-Trace', value: '={{ $execution.id }}' },
				],
			},
			sendBody: true,
			bodyParameters: { parameters: [{ name: 'note', value: 'hi' }] },
		});

		expect(form.query).toEqual([
			{ key: 'name', value: '', fromInput: true },
			{ key: 'lang', value: 'de', fromInput: false },
		]);
		expect(form.headers).toEqual([{ key: 'Accept', value: 'application/json' }]);
		expect(form.body).toEqual([{ key: 'note', value: 'hi', fromInput: false }]);
	});

	it('leaves out a body that is not JSON fields, and values in JSON mode', () => {
		const form = httpActionFormOfRequest({
			url: 'https://api.acme.com/upload',
			sendQuery: true,
			specifyQuery: 'json',
			jsonQuery: '{"a":1}',
			sendBody: true,
			contentType: 'multipart-form-data',
			bodyParameters: { parameters: [{ name: 'file', value: 'data' }] },
		});

		expect(form.query).toEqual([]);
		expect(form.body).toEqual([]);
	});

	it.each([
		[{ authentication: 'predefinedCredentialType', nodeCredentialType: 'slackApi' }, 'slackApi'],
		[
			{ authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' },
			'httpHeaderAuth',
		],
		[{ authentication: 'genericCredentialType', genericAuthType: 'httpBasicAuth' }, undefined],
		[{ authentication: 'none' }, undefined],
	])('carries the credential type of %o over when an action can send it', (auth, expected) => {
		const form = httpActionFormOfRequest({ url: 'https://api.acme.com/greet', ...auth });

		expect(form.credentialType).toBe(expected);
	});
});

describe('startHttpActionDraft', () => {
	beforeEach(() => localStorage.clear());

	it('starts a draft for the app, and keeps a draft that the form already holds', () => {
		startHttpActionDraft('Acme');
		startHttpActionDraft('Other');

		expect(
			JSON.parse(localStorage.getItem('N8N_NEXT_NODES_HTTP_ACTION_DRAFT') ?? '{}'),
		).toMatchObject({
			appName: 'Acme',
		});
	});
});
