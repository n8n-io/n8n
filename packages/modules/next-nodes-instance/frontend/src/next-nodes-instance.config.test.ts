import {
	configOf,
	emptyForm,
	formOfConfig,
	flowOf,
	identifierOf,
	inputNamesOf,
	issuesOf,
	testedPartOf,
	testParamsOf,
	trimmedSchemaOf,
	usableCredentialTypesOf,
	type HttpActionForm,
} from './next-nodes-instance.config';

const greeting: HttpActionForm = {
	...emptyForm(),
	appName: 'Acme',
	actionName: 'Get a greeting',
	baseUrl: 'https://api.acme.com',
	path: '/v1/greetings/{lang}',
	query: [
		{ key: 'name', value: '', fromInput: true },
		{ key: 'format', value: 'json', fromInput: false },
	],
	headers: [{ key: 'Accept', value: 'application/json' }],
	inputs: { name: { type: 'string', required: false, description: 'Who to greet' } },
};

describe('configOf', () => {
	it('gives the contract, the request, and the inputs of the path and the query', () => {
		expect(configOf(greeting)).toEqual({
			contract: {
				id: 'acme.getAGreeting',
				version: 1,
				node: 'acme',
				action: 'Get a greeting',
				summary: 'Get a greeting',
				flow: { effect: 'read', cardinality: 'per-item', idempotent: true, passthrough: 'replace' },
				credentials: [],
				input: {
					type: 'object',
					properties: {
						lang: { type: 'string' },
						name: { type: 'string', description: 'Who to greet' },
					},
					required: ['lang'],
					additionalProperties: false,
				},
				output: { type: 'object' },
			},
			node: { displayName: 'Acme' },
			baseUrl: 'https://api.acme.com',
			request: {
				method: 'GET',
				path: '/v1/greetings/{lang}',
				query: { name: { input: 'name' }, format: 'json' },
				headers: { Accept: 'application/json' },
			},
		});
	});

	it('gives a list binding, and keeps the overrides of Advanced', () => {
		const config = configOf({
			...greeting,
			method: 'POST',
			response: { kind: 'list', items: '/results', paging: { style: 'link' } },
			advanced: { id: 'acme.greeting.search', effect: 'read', idempotent: true },
		});

		expect(config.request).toBeUndefined();
		expect(config.list).toMatchObject({
			method: 'POST',
			items: '/results',
			pages: { style: 'link' },
		});
		expect(config.contract).toMatchObject({
			id: 'acme.greeting.search',
			node: 'acme',
			flow: { effect: 'read', cardinality: '1:N', idempotent: true },
		});
	});

	it('keeps a path input required, whatever its settings say', () => {
		const lang = { type: 'string', required: false, description: '' } as const;
		const form = { ...greeting, inputs: { ...greeting.inputs, lang } };
		expect(configOf(form).contract.input.required).toEqual(['lang']);
	});
});

describe('the parts the form derives', () => {
	it.each([
		['GET', 'read', true],
		['HEAD', 'read', true],
		['PUT', 'write', true],
		['DELETE', 'write', true],
		['POST', 'write', false],
		['PATCH', 'write', false],
	] as const)('derives the flow of %s', (method, effect, idempotent) => {
		expect(flowOf(method)).toEqual({ effect, idempotent });
	});

	it.each([
		['Get a greeting', 'getAGreeting'],
		['  HubSpot CRM ', 'hubspotCrm'],
		['2fa codes', ''],
		['Café', 'cafe'],
	])('makes %j an identifier', (text, id) => {
		expect(identifierOf(text)).toBe(id);
	});

	it('lists each input once, the path holes first', () => {
		const form = { ...greeting, body: [{ key: 'lang', value: '', fromInput: true }] };
		expect(inputNamesOf(form)).toEqual(['lang', 'name']);
	});

	it('names what the form lacks', () => {
		expect(issuesOf(emptyForm())).toEqual(['appName', 'actionName', 'baseUrl']);
		expect(issuesOf({ ...greeting, advanced: { id: 'Acme' } })).toEqual(['id']);
		expect(issuesOf(greeting)).toEqual([]);
	});

	it('types the test values as the inputs declare them, and leaves out empty ones', () => {
		const form = {
			...greeting,
			inputs: {
				...greeting.inputs,
				lang: { type: 'integer', required: true, description: '' },
			},
		} as const;
		expect(testParamsOf(form, { lang: '7', name: ' ' })).toEqual({ lang: 7 });
	});

	it('does not count the output schema as a part that the test run covers', () => {
		const config = configOf(greeting);
		const trimmed = { ...config, contract: { ...config.contract, output: { type: 'object' } } };
		expect(testedPartOf(trimmed)).toBe(testedPartOf(config));
		expect(testedPartOf(configOf({ ...greeting, path: '/v2/{lang}' }))).not.toBe(
			testedPartOf(config),
		);
	});

	it('trims the schema to the kept top-level properties', () => {
		const schema = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'number' } } };
		expect(trimmedSchemaOf(schema, new Set(['b']))).toEqual({
			type: 'object',
			properties: { b: { type: 'number' } },
		});
	});
});

describe('credentials', () => {
	it('puts the credential type of the form into the contract', () => {
		expect(configOf({ ...greeting, credentialType: 'slackApi' }).contract.credentials).toEqual([
			'slackApi',
		]);
	});

	it('offers the types of the HTTP Request node and the generic types that sign a request', () => {
		const types = usableCredentialTypesOf([
			{ name: 'slackApi', displayName: 'Slack API', httpRequestNode: true },
			{ name: 'httpBasicAuth', displayName: 'Basic Auth', httpRequestNode: false },
			{ name: 'httpHeaderAuth', displayName: 'Header Auth', httpRequestNode: false },
			{ name: 'postgres', displayName: 'Postgres', httpRequestNode: false },
		]);

		expect(types.map(({ name }) => name)).toEqual(['httpHeaderAuth', 'slackApi']);
	});
});

describe('an action of a shipped node', () => {
	const lock: HttpActionForm = {
		...emptyForm(),
		actionName: 'Lock an issue',
		method: 'PUT',
		path: '/repos/{owner}/{repository}/issues/{issueNumber}/lock',
		extends: {
			node: 'github',
			displayName: 'GitHub',
			credentialTypes: ['githubApi', 'githubOAuth2Api'],
			resource: 'issue',
			resourceFields: ['owner', 'repository'],
		},
	};

	it('extends the node and leaves its base URL and credentials to the server', () => {
		const config = configOf(lock);

		expect(config).toMatchObject({
			extends: 'github',
			contract: { id: 'github.issue.lockAnIssue', node: 'github', credentials: [] },
		});
		expect(config.baseUrl).toBeUndefined();
		expect(config.node).toBeUndefined();
	});

	it('needs no app name or base URL, and asks for the resource inputs first', () => {
		expect(issuesOf(lock)).toEqual([]);
		expect(inputNamesOf(lock)).toEqual(['owner', 'repository', 'issueNumber']);
	});
});

describe('formOfConfig', () => {
	const parents = [
		{
			id: 'github',
			displayName: 'GitHub',
			credentialTypes: ['githubApi', 'githubOAuth2Api'],
			resources: { issue: ['owner', 'repository'] },
		},
	];
	const list: HttpActionForm = {
		...greeting,
		method: 'POST',
		body: [{ key: 'q', value: '', fromInput: true }],
		response: {
			kind: 'list',
			items: '/results',
			paging: { style: 'cursor', next: '/next', send: { body: 'cursor' } },
		},
		credentialType: 'httpHeaderAuth',
		output: { type: 'object', properties: { id: { type: 'string' } } },
		advanced: { effect: 'read' },
	};
	const lock: HttpActionForm = {
		...emptyForm(),
		actionName: 'Lock an issue',
		method: 'PUT',
		path: '/repos/{owner}/{repository}/issues/{issueNumber}/lock',
		inputs: { issueNumber: { type: 'integer', required: true, description: 'The issue' } },
		extends: {
			node: 'github',
			displayName: 'GitHub',
			credentialTypes: ['githubApi', 'githubOAuth2Api'],
			resource: 'issue',
			resourceFields: ['owner', 'repository'],
		},
	};

	it.each([
		['a single request', greeting],
		['a paged list with a credential', list],
		['an action of a shipped node', lock],
	])('gives back the config of %s', (_, form) => {
		const config = configOf(form);

		expect(configOf(formOfConfig({ ...config }, parents))).toEqual(config);
	});

	it('keeps the id of the action', () => {
		const form = formOfConfig({ ...configOf(greeting) }, parents);

		expect(form.advanced.id).toBe('acme.getAGreeting');
	});
});
