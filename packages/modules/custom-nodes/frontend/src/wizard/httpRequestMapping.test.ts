import { mapHttpRequestParameters } from './httpRequestMapping';

describe('mapHttpRequestParameters', () => {
	it('copies the method and a plain URL', () => {
		const mapped = mapHttpRequestParameters({
			method: 'POST',
			url: 'https://api.acme.test/v1/items',
		});

		expect(mapped.request.method).toBe('POST');
		expect(mapped.request.url).toBe('https://api.acme.test/v1/items');
		expect(mapped.inputs).toEqual([]);
		expect(mapped.dropped).toEqual([]);
	});

	it('turns each expression of the URL path into a placeholder with a required URL input', () => {
		const mapped = mapHttpRequestParameters({
			url: '=https://api.acme.test/v1/customers/{{ $json.customerId }}/orders/{{ $json.id }}',
		});

		expect(mapped.request.url).toBe('https://api.acme.test/v1/customers/{customerId}/orders/{id}');
		expect(mapped.inputs).toEqual([
			expect.objectContaining({
				name: 'customerId',
				key: 'customerId',
				target: 'url',
				required: true,
			}),
			expect.objectContaining({ name: 'id', key: 'id', target: 'url', required: true }),
		]);
	});

	it('copies plain headers and query parameters as fixed values', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendHeaders: true,
			headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
			sendQuery: true,
			queryParameters: { parameters: [{ name: 'limit', value: '10' }] },
		});

		expect(mapped.request.headers).toEqual([
			expect.objectContaining({ key: 'Accept', value: 'application/json' }),
		]);
		expect(mapped.request.query).toEqual([expect.objectContaining({ key: 'limit', value: '10' })]);
	});

	it('turns an expression value into a required input of the same target', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendQuery: true,
			queryParameters: { parameters: [{ name: 'page', value: '={{ $json.page }}' }] },
			sendHeaders: true,
			headerParameters: { parameters: [{ name: 'X-Tenant', value: '={{ $json.tenant }}' }] },
		});

		expect(mapped.request.query).toEqual([]);
		expect(mapped.request.headers).toEqual([]);
		expect(mapped.inputs).toEqual([
			expect.objectContaining({
				name: 'tenant',
				key: 'X-Tenant',
				target: 'header',
				required: true,
			}),
			expect.objectContaining({ name: 'page', key: 'page', target: 'query', required: true }),
		]);
	});

	it.each(['Authorization', 'cookie', 'Proxy-Authorization'])(
		'never copies the %s header and reports it',
		(header) => {
			const mapped = mapHttpRequestParameters({
				url: 'https://api.acme.test/items',
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{ name: header, value: 'Bearer abc' },
						{ name: 'Accept', value: 'application/json' },
					],
				},
			});

			expect(mapped.request.headers.map((entry) => entry.key)).toEqual(['Accept']);
			expect(mapped.inputs).toEqual([]);
			expect(mapped.dropped).toEqual([header]);
		},
	);

	it.each(['X-API-Key', 'X-Auth-Token', 'X-Shopify-Access-Token', 'X-Hub-Signature'])(
		'never copies the %s header, keeps a harmless header, and reports it',
		(header) => {
			const mapped = mapHttpRequestParameters({
				url: 'https://api.acme.test/items',
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{ name: header, value: 'abc123' },
						{ name: 'Accept', value: 'application/json' },
					],
				},
			});

			expect(mapped.request.headers).toEqual([
				expect.objectContaining({ key: 'Accept', value: 'application/json' }),
			]);
			expect(mapped.dropped).toEqual([header]);
		},
	);

	it.each(['password', 'session_id'])('never copies the query parameter %s', (name) => {
		const mapped = mapHttpRequestParameters({
			url: `https://api.acme.test/items?${name}=abc&limit=5`,
		});

		expect(mapped.request.query.map((entry) => entry.key)).toEqual(['limit']);
		expect(mapped.dropped).toEqual([name]);
	});

	it('drops a fixed JSON body field with a secret name and reports it', () => {
		const mapped = mapHttpRequestParameters({
			method: 'POST',
			url: 'https://api.acme.test/oauth/token',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '{"grant_type": "client_credentials", "client_secret": "abc123"}',
		});

		expect(JSON.parse(mapped.request.bodyText)).toEqual({ grant_type: 'client_credentials' });
		expect(mapped.dropped).toEqual(['client_secret']);
	});

	it('drops a nested fixed JSON body field with a secret name and reports its path', () => {
		const mapped = mapHttpRequestParameters({
			method: 'POST',
			url: 'https://api.acme.test/login',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '{"status": "open", "auth": {"password": "hunter2"}}',
		});

		expect(JSON.parse(mapped.request.bodyText)).toEqual({ status: 'open', auth: {} });
		expect(mapped.dropped).toEqual(['auth.password']);
	});

	it('keeps a JSON body field with a secret name as an input when its value is an expression', () => {
		const mapped = mapHttpRequestParameters({
			method: 'POST',
			url: 'https://api.acme.test/login',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '={"password": "{{ $json.password }}"}',
		});

		expect(mapped.dropped).toEqual([]);
		expect(mapped.inputs).toEqual([
			expect.objectContaining({ name: 'password', key: 'password', target: 'body' }),
		]);
	});

	it('copies no JSON body that does not parse when it has a field with a secret name', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '={ "id": {{ $json.id }}, "api_key": "abc123" }',
		});

		expect(mapped.request.bodyText).toBe('');
		expect(mapped.dropped).toEqual(['api_key']);
	});

	it('drops a fixed form body parameter with a secret name and reports it', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendBody: true,
			contentType: 'form-urlencoded',
			bodyParameters: {
				parameters: [
					{ name: 'grant', value: 'all' },
					{ name: 'password', value: 'hunter2' },
				],
			},
		});

		expect(JSON.parse(mapped.request.bodyText)).toEqual({ grant: 'all' });
		expect(mapped.dropped).toEqual(['password']);
	});

	it.each(['api_key', 'accessToken', 'client_SECRET', 'Key'])(
		'never copies the query parameter %s and reports it',
		(name) => {
			const mapped = mapHttpRequestParameters({
				url: 'https://api.acme.test/items',
				sendQuery: true,
				queryParameters: {
					parameters: [
						{ name, value: '={{ $json.value }}' },
						{ name: 'limit', value: '10' },
					],
				},
			});

			expect(mapped.request.query.map((entry) => entry.key)).toEqual(['limit']);
			expect(mapped.inputs).toEqual([]);
			expect(mapped.dropped).toEqual([name]);
		},
	);

	it('moves the query string of the URL to the query parameters and drops secrets in it', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items?limit=5&api_key=abc',
		});

		expect(mapped.request.url).toBe('https://api.acme.test/items');
		expect(mapped.request.query).toEqual([expect.objectContaining({ key: 'limit', value: '5' })]);
		expect(mapped.dropped).toEqual(['api_key']);
	});

	it('drops secret headers from JSON headers', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendHeaders: true,
			specifyHeaders: 'json',
			jsonHeaders: '{"Authorization": "Bearer abc", "Accept": "text/plain"}',
		});

		expect(mapped.request.headers.map((entry) => entry.key)).toEqual(['Accept']);
		expect(mapped.dropped).toEqual(['Authorization']);
	});

	it('keeps the fixed part of a JSON body and turns its expressions into body inputs', () => {
		const mapped = mapHttpRequestParameters({
			method: 'POST',
			url: 'https://api.acme.test/items',
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '={"status": "open", "customer": {"email": "{{ $json.email }}"}}',
		});

		expect(mapped.request.bodyType).toBe('json');
		expect(JSON.parse(mapped.request.bodyText)).toEqual({ status: 'open', customer: {} });
		expect(mapped.inputs).toEqual([
			expect.objectContaining({ name: 'email', key: 'customer.email', target: 'body' }),
		]);
	});

	it('keeps a JSON body that does not parse as text, so the user can fix it', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '={ "id": {{ $json.id }} }',
		});

		expect(mapped.request.bodyText).toBe('{ "id": {{ $json.id }} }');
	});

	it('maps form body parameters', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendBody: true,
			contentType: 'form-urlencoded',
			bodyParameters: {
				parameters: [
					{ name: 'grant', value: 'all' },
					{ name: 'title', value: '={{ $json.title }}' },
				],
			},
		});

		expect(mapped.request.bodyType).toBe('form');
		expect(JSON.parse(mapped.request.bodyText)).toEqual({ grant: 'all' });
		expect(mapped.inputs).toEqual([expect.objectContaining({ name: 'title', target: 'body' })]);
	});

	it('maps the authentication', () => {
		expect(
			mapHttpRequestParameters({
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'githubApi',
			}).auth,
		).toEqual({ kind: 'predefined', credentialType: 'githubApi' });
		expect(
			mapHttpRequestParameters({
				authentication: 'genericCredentialType',
				genericAuthType: 'httpBearerAuth',
			}).auth,
		).toEqual({ kind: 'generic', type: 'httpBearerAuth' });
		expect(
			mapHttpRequestParameters({
				authentication: 'genericCredentialType',
				genericAuthType: 'oAuth2Api',
			}).auth,
		).toEqual({ kind: 'none' });
	});

	it('gives each input a unique name that is not reserved', () => {
		const mapped = mapHttpRequestParameters({
			url: 'https://api.acme.test/items',
			sendQuery: true,
			queryParameters: {
				parameters: [
					{ name: 'operation', value: '={{ $json.mode }}' },
					{ name: 'id', value: '={{ $json.id }}' },
					{ name: 'other', value: '={{ $json.id }}' },
				],
			},
		});

		expect(mapped.inputs.map((input) => input.name)).toEqual(['mode', 'id', 'id2']);
	});
});
