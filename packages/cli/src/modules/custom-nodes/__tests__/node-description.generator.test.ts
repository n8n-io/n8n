import { UnexpectedError } from '@n8n/errors';
import type {
	IDataObject,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	INodeParameters,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';

import {
	ADDITIONAL_FIELDS,
	buildInputProperties,
	buildRequest,
	generateCustomNodeDescription,
	type ActionVersionView,
	type ActionView,
	type CustomNodeView,
} from '../node-description.generator';
import {
	OPERATION_PARAMETER,
	PIN_ACTION_ID_PARAMETER,
	PIN_ACTION_NAME_PARAMETER,
	operationOptions,
	pinProperties,
	showFor,
} from '../version-pin';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const node: CustomNodeView = {
	id: 'cn_acme',
	displayName: 'Acme Billing',
	description: 'Invoices in Acme Billing',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'generic', type: 'httpHeaderAuth' },
};

const getInvoice: ActionView = {
	id: 'act_get',
	name: 'Get Invoice',
	description: 'Reads one invoice',
	versions: [
		{
			version: 1,
			inputs: [
				{ name: 'invoiceId', displayName: 'Invoice ID', type: 'string', required: true },
				{
					name: 'includeLines',
					displayName: 'Include Lines',
					type: 'boolean',
					required: false,
					default: false,
				},
			],
			request: {
				method: 'GET',
				url: '/invoices/{invoiceId}',
				headers: {},
				query: { expand: 'customer' },
				bodyType: 'none',
				body: {},
				inputTargets: {
					invoiceId: { target: 'url', key: 'invoiceId' },
					includeLines: { target: 'query', key: 'include_lines' },
				},
			},
		},
	],
};

const createV1: ActionVersionView = {
	version: 1,
	inputs: [
		{ name: 'amount', displayName: 'Amount', type: 'number', required: true },
		{ name: 'customerId', displayName: 'Customer ID', type: 'string', required: true },
	],
	request: {
		method: 'POST',
		url: '/invoices',
		headers: { 'X-Api-Version': '1' },
		query: {},
		bodyType: 'json',
		body: { source: 'n8n', meta: { channel: 'api', tags: ['a', 'b'] } },
		inputTargets: {
			amount: { target: 'body', key: 'amount' },
			customerId: { target: 'body', key: 'customer.id' },
		},
	},
};

const createV2: ActionVersionView = {
	version: 2,
	inputs: [
		{ name: 'amount', displayName: 'Amount', type: 'number', required: true },
		{
			name: 'currency',
			displayName: 'Currency',
			type: 'options',
			options: [
				{ name: 'Euro', value: 'eur' },
				{ name: 'Dollar', value: 'usd' },
			],
			required: false,
			default: 'eur',
		},
		{ name: 'lineItems0Price', displayName: 'First Line Price', type: 'number', required: false },
		{ name: 'metadata', displayName: 'Metadata', type: 'json', required: false },
		{ name: 'idempotencyKey', displayName: 'Idempotency Key', type: 'string', required: false },
	],
	request: {
		method: 'POST',
		url: '/v2/invoices',
		headers: { 'X-Api-Version': '2' },
		query: {},
		bodyType: 'json',
		body: {},
		inputTargets: {
			amount: { target: 'body', key: 'amount' },
			currency: { target: 'body', key: 'currency' },
			lineItems0Price: { target: 'body', key: 'line_items[0].price' },
			metadata: { target: 'body', key: 'metadata' },
			idempotencyKey: { target: 'header', key: 'Idempotency-Key' },
		},
	},
};

const createInvoice: ActionView = {
	id: 'act_create',
	name: 'Create Invoice',
	versions: [createV1, createV2],
};

const formVersion: ActionVersionView = {
	version: 1,
	inputs: [],
	request: {
		method: 'POST',
		url: '/forms',
		headers: {},
		query: {},
		bodyType: 'form',
		body: { kind: 'invoice' },
		inputTargets: {},
	},
};

const p = (name: string) => `$parameter["${name}"]`;

const withRequest = (patch: Partial<ActionVersionView['request']>): ActionVersionView => ({
	...getInvoice.versions[0],
	request: { ...getInvoice.versions[0].request, ...patch },
});
const versionWithUrl = (url: string) => withRequest({ url });

const isOption = (value: unknown): value is INodePropertyOptions =>
	typeof value === 'object' && value !== null && 'value' in value && !('type' in value);

function operationProperty(d: INodeTypeDescription): INodeProperties {
	const found = d.properties.find((prop) => prop.name === OPERATION_PARAMETER);
	if (!found) throw new Error('no operation property');
	return found;
}

function operationOptionsOf(d: INodeTypeDescription): INodePropertyOptions[] {
	return (operationProperty(d).options ?? []).filter(isOption);
}

function optionFor(d: INodeTypeDescription, actionId: string, version: number) {
	const [value] = showFor(actionId, version)[OPERATION_PARAMETER] ?? [];
	const found = operationOptionsOf(d).find((option) => option.value === value);
	if (!found) throw new Error('no option');
	return found;
}

/** Every [key, value] pair in a value, at any depth. */
function walk(root: unknown): Array<[string, unknown]> {
	const out: Array<[string, unknown]> = [];
	const stack: unknown[] = [root];
	while (stack.length > 0) {
		const value = stack.pop();
		if (Array.isArray(value)) stack.push(...(value as unknown[]));
		else if (value !== null && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				out.push([key, child]);
				stack.push(child);
			}
		}
	}
	return out;
}

function stringsIn(root: unknown): string[] {
	const out: string[] = [];
	if (typeof root === 'string') out.push(root);
	for (const [key, value] of walk(root)) {
		out.push(key);
		if (typeof value === 'string') out.push(value);
	}
	return out;
}

const d = generateCustomNodeDescription(node, [getInvoice, createInvoice]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateCustomNodeDescription', () => {
	it('sets the basic description fields', () => {
		expect(d.name).toBe(node.id);
		expect(d.displayName).toBe('Acme Billing');
		expect(d.description).toBe('Invoices in Acme Billing');
		expect(d.version).toBe(1);
		expect(d.group).toEqual(['transform']);
		expect(d.defaults).toEqual({ name: 'Acme Billing' });
		expect(d.inputs).toEqual([NodeConnectionTypes.Main]);
		expect(d.outputs).toEqual([NodeConnectionTypes.Main]);
		expect(d.requestDefaults).toEqual({ baseURL: 'https://billing.acme.test/api', json: true });
		expect(d.userDefinedEndpoint).toBe(true);
		expect(d.credentials).toEqual([{ name: 'httpHeaderAuth', required: true }]);
		expect(d.hidden).toBeUndefined();
		expect(d.usableAsTool).toBeUndefined();
		// The editor shows the name of the selected `operation` option when there is no subtitle.
		expect(d.subtitle).toBeUndefined();
	});

	it('uses a cube icon without an icon URL, and only the icon URL with one', () => {
		expect(d.icon).toBe('fa:cube');
		expect(d.iconUrl).toBeUndefined();

		const withIcon = generateCustomNodeDescription(
			{ ...node, iconUrl: '/rest/custom-nodes/cn_acme/icon' },
			[getInvoice],
		);
		expect(withIcon.iconUrl).toBe('/rest/custom-nodes/cn_acme/icon');
		expect(withIcon.icon).toBeUndefined();
	});

	it('uses a short default description when the node has none', () => {
		const { description: _, ...withoutDescription } = node;
		const generated = generateCustomNodeDescription(withoutDescription, [getInvoice]);
		expect(typeof generated.description).toBe('string');
		expect(generated.description.length).toBeGreaterThan(0);
	});

	it.each([
		[{ kind: 'none' } as const, []],
		[
			{ kind: 'predefined', credentialType: 'acmeApi' } as const,
			[{ name: 'acmeApi', required: true }],
		],
		[
			{ kind: 'generic', type: 'httpBearerAuth' } as const,
			[{ name: 'httpBearerAuth', required: true }],
		],
	])('maps auth %j to credentials', (auth, expected) => {
		expect(generateCustomNodeDescription({ ...node, auth }, [getInvoice]).credentials).toEqual(
			expected,
		);
	});

	it('emits the operation property with the version-pin options and an empty default', () => {
		const operation = operationProperty(d);
		expect(d.properties[0]).toBe(operation);
		expect(operation.type).toBe('options');
		expect(operation.noDataExpression).toBe(true);
		expect(operation.default).toBe('');

		const expected = operationOptions([
			{ id: 'act_get', name: 'Get Invoice', description: 'Reads one invoice', versions: [1] },
			{ id: 'act_create', name: 'Create Invoice', versions: [1, 2] },
		]);
		const { routing: _r1, ...first } = operationOptionsOf(d)[0];
		expect(first).toEqual(expected[0]);
		expect(operationOptionsOf(d).map(({ routing: _, ...rest }) => rest)).toEqual(expected);
	});

	it('adds the pin properties', () => {
		const pins = pinProperties([]);
		for (const pin of pins) {
			expect(d.properties).toContainEqual(pin);
		}
		expect(d.properties.map((prop) => prop.name)).toEqual(
			expect.arrayContaining([PIN_ACTION_ID_PARAMETER, PIN_ACTION_NAME_PARAMETER]),
		);
	});

	it('puts the fixed request of each version in the routing of its operation option', () => {
		expect(optionFor(d, 'act_get', 1).routing).toEqual({
			request: {
				method: 'GET',
				url: '=/invoices/{{ encodeURIComponent($parameter["invoiceId"]) }}',
				qs: { expand: 'customer' },
			},
		});
		expect(optionFor(d, 'act_create', 1).routing).toEqual({
			request: {
				method: 'POST',
				url: '/invoices',
				headers: { 'X-Api-Version': '1' },
				body: { source: 'n8n', meta: { channel: 'api', tags: ['a', 'b'] } },
			},
		});
		expect(optionFor(d, 'act_create', 2).routing).toEqual({
			request: { method: 'POST', url: '/v2/invoices', headers: { 'X-Api-Version': '2' } },
		});
	});

	it('emits the properties of every version, each shown only for its version', () => {
		const amounts = d.properties.filter((prop) => prop.name === 'amount');
		expect(amounts).toHaveLength(2);
		expect(amounts.map((prop) => prop.displayOptions)).toEqual([
			{ show: showFor('act_create', 1) },
			{ show: showFor('act_create', 2) },
		]);

		for (const prop of d.properties) {
			if (prop.name === OPERATION_PARAMETER) continue;
			if (prop.name === PIN_ACTION_ID_PARAMETER || prop.name === PIN_ACTION_NAME_PARAMETER) {
				expect(prop.displayOptions).toBeUndefined();
				continue;
			}
			expect(prop.displayOptions?.show?.[OPERATION_PARAMETER]).toHaveLength(1);
		}

		expect(d.properties.map((prop) => prop.name)).toEqual([
			OPERATION_PARAMETER,
			PIN_ACTION_ID_PARAMETER,
			PIN_ACTION_NAME_PARAMETER,
			'invoiceId',
			ADDITIONAL_FIELDS,
			'amount',
			'customerId',
			'amount',
			ADDITIONAL_FIELDS,
		]);
	});

	it('uses the param path of an optional URL input with a fallback', () => {
		const optionalUrl: ActionView = {
			id: 'act_list',
			name: 'List',
			versions: [
				{
					version: 1,
					inputs: [{ name: 'folder', displayName: 'Folder', type: 'string', required: false }],
					request: {
						method: 'GET',
						url: '/folders/{folder}/items',
						headers: {},
						query: {},
						bodyType: 'none',
						body: {},
						inputTargets: { folder: { target: 'url', key: 'folder' } },
					},
				},
			],
		};
		const generated = generateCustomNodeDescription(node, [optionalUrl]);
		expect(optionFor(generated, 'act_list', 1).routing?.request?.url).toBe(
			`=/folders/{{ encodeURIComponent(($parameter["${ADDITIONAL_FIELDS}"]?.["folder"] ?? "")) }}/items`,
		);
	});

	it('never uses a display name as an option value or a parameter default', () => {
		const displayTexts = [
			'Acme Billing',
			'Get Invoice',
			'Create Invoice',
			'Reads one invoice',
			'Invoice ID',
			'Euro',
			'Dollar',
		];
		for (const [key, value] of walk(d.properties)) {
			if (key === 'value' || key === 'default') {
				expect(displayTexts).not.toContain(value);
			}
		}
	});

	it('emits no hooks, pagination, or request operations', () => {
		const forbidden = [
			'preSend',
			'postReceive',
			'paginate',
			'pagination',
			'requestOperations',
			'operations',
		];
		for (const [key] of walk(d)) {
			expect(forbidden).not.toContain(key);
		}
		for (const [, value] of walk(d)) {
			expect(typeof value).not.toBe('function');
		}
	});

	it('emits only expressions that the generator itself builds', () => {
		const allowed = [
			/^=\{\{ \$value \}\}$/,
			/^=\{\{ typeof \$value === "string" \? JSON\.parse\(\$value\) : \$value \}\}$/,
			/^=\/invoices\/\{\{ encodeURIComponent\(\$parameter\["invoiceId"\]\) \}\}$/,
		];
		const expressions = stringsIn(d).filter(
			(s) => s.trimStart().startsWith('=') || s.includes('{{'),
		);
		expect(expressions.length).toBeGreaterThan(0);
		for (const expression of expressions) {
			expect(allowed.some((pattern) => pattern.test(expression))).toBe(true);
		}
	});

	it('does not share objects with its input', () => {
		const generated = generateCustomNodeDescription(node, [createInvoice]);
		const body = optionFor(generated, 'act_create', 1).routing?.request?.body;
		if (typeof body !== 'object' || body === null || Array.isArray(body))
			throw new Error('no body');
		(body as IDataObject).source = 'changed';
		expect(createV1.request.body).toEqual({
			source: 'n8n',
			meta: { channel: 'api', tags: ['a', 'b'] },
		});
	});

	it('skips an action without versions', () => {
		const generated = generateCustomNodeDescription(node, [
			{ id: 'act_empty', name: 'Empty', versions: [] },
		]);
		expect(operationOptionsOf(generated)).toEqual([]);
		expect(generated.properties.map((prop) => prop.name)).toEqual([
			OPERATION_PARAMETER,
			PIN_ACTION_ID_PARAMETER,
			PIN_ACTION_NAME_PARAMETER,
		]);
	});

	it.each(['=https://evil.test', 'https://{{ $credentials.host }}'])(
		'rejects the base URL %s',
		(baseUrl) => {
			expect(() => generateCustomNodeDescription({ ...node, baseUrl }, [getInvoice])).toThrow(
				UnexpectedError,
			);
		},
	);

	it('rejects an action id that looks like an expression', () => {
		expect(() => generateCustomNodeDescription(node, [{ ...getInvoice, id: '={{ 1 }}' }])).toThrow(
			UnexpectedError,
		);
	});
});

describe('buildRequest', () => {
	it('builds the fixed GET request with an encoded URL placeholder', () => {
		const req = buildRequest(getInvoice.versions[0], (n) => `$parameter["${n}"]`);
		expect(req.method).toBe('GET');
		expect(req.url).toBe('=/invoices/{{ encodeURIComponent($parameter["invoiceId"]) }}');
		expect(req.qs).toEqual({ expand: 'customer' });
		expect(req.headers).toBeUndefined();
		expect(req.body).toBeUndefined();
		expect(req.json).toBeUndefined();
	});

	it('keeps a URL without placeholders as a plain string', () => {
		expect(buildRequest(createV1, p).url).toBe('/invoices');
	});

	it('encodes every placeholder of the path', () => {
		const version: ActionVersionView = {
			...getInvoice.versions[0],
			inputs: [
				{ name: 'customerId', displayName: 'Customer', type: 'string', required: true },
				{ name: 'invoiceId', displayName: 'Invoice', type: 'string', required: true },
			],
			request: {
				...getInvoice.versions[0].request,
				url: 'https://other.acme.test/c/{customerId}/i/{invoiceId}?x=1',
				query: {},
				inputTargets: {
					customerId: { target: 'url', key: 'customerId' },
					invoiceId: { target: 'url', key: 'invoiceId' },
				},
			},
		};
		expect(buildRequest(version, p).url).toBe(
			'=https://other.acme.test/c/{{ encodeURIComponent($parameter["customerId"]) }}/i/{{ encodeURIComponent($parameter["invoiceId"]) }}?x=1',
		);
	});

	it('sends the fixed headers and the fixed body of a JSON request', () => {
		const req = buildRequest(createV1, p);
		expect(req.headers).toEqual({ 'X-Api-Version': '1' });
		expect(req.body).toEqual({ source: 'n8n', meta: { channel: 'api', tags: ['a', 'b'] } });
	});

	it('sets the form content type for a form body', () => {
		expect(buildRequest(formVersion, p).headers).toEqual({
			'Content-Type': 'application/x-www-form-urlencoded',
		});
		expect(buildRequest(formVersion, p).body).toEqual({ kind: 'invoice' });
	});

	it('keeps a content type that the definition sets', () => {
		const version: ActionVersionView = {
			...formVersion,
			request: { ...formVersion.request, headers: { 'content-type': 'text/plain' } },
		};
		expect(buildRequest(version, p).headers).toEqual({ 'content-type': 'text/plain' });
	});

	it('sends no body when the body type is none', () => {
		const version = withRequest({ bodyType: 'none', body: { ignored: 'yes' } });
		expect(buildRequest(version, p).body).toBeUndefined();
	});

	// A literal that looks like an expression cannot reach RoutingNode.
	// The validator rejects it. The generator asserts it again.
	it.each([
		['url', versionWithUrl('=/x')],
		['url with spaces', versionWithUrl('  =/x')],
		['url', versionWithUrl('/x/{{ $credentials.token }}')],
		['header name', withRequest({ headers: { '={{ 1 }}': 'a' } })],
		['header value', withRequest({ headers: { Accept: '={{ $credentials.token }}' } })],
		['header value', withRequest({ headers: { Accept: 'a{{ 1 }}' } })],
		['query key', withRequest({ query: { '=k': 'a' } })],
		['query value', withRequest({ query: { k: '={{ 1 }}' } })],
		['body leaf', withRequest({ bodyType: 'json', body: { a: { b: ['={{ 1 }}'] } } })],
		['body key', withRequest({ bodyType: 'json', body: { a: { '={{ 1 }}': 'x' } } })],
		[
			'input key',
			withRequest({
				inputTargets: {
					invoiceId: { target: 'url', key: 'invoiceId' },
					includeLines: { target: 'query', key: '={{ $credentials.token }}' },
				},
			}),
		],
	])('throws for an expression in the %s', (_where, version) => {
		expect(() => buildRequest(version, p)).toThrow(UnexpectedError);
	});

	it.each([
		['an unknown placeholder', '/invoices/{other}'],
		['a placeholder with an invalid name', '/invoices/{a"]+$credentials+["}'],
		['a placeholder in the host', 'https://{invoiceId}.acme.test/x'],
		['a placeholder in the query string', '/invoices?id={invoiceId}'],
		['an unmatched brace', '/invoices/{invoiceId'],
	])('throws for %s', (_case, url) => {
		expect(() => buildRequest(versionWithUrl(url), p)).toThrow(UnexpectedError);
	});

	it('throws when a placeholder belongs to an input that does not target the URL', () => {
		const version = withRequest({
			url: '/invoices/{includeLines}',
		});
		expect(() => buildRequest(version, p)).toThrow(UnexpectedError);
	});
});

describe('buildInputProperties', () => {
	const v2Props = buildInputProperties(createV2, showFor('act_create', 2));
	const additional = v2Props.find((prop) => prop.name === ADDITIONAL_FIELDS);
	const bodyProp = (name: string) => {
		const found = (additional?.options ?? []).find(
			(option): option is INodeProperties =>
				'name' in option && option.name === name && 'type' in option,
		);
		if (!found) throw new Error(`no property ${name}`);
		return found;
	};

	it('puts required inputs at the top level and optional inputs in a collection', () => {
		const props = buildInputProperties(getInvoice.versions[0], showFor(getInvoice.id, 1));
		expect(props.map((prop) => prop.name)).toEqual(['invoiceId', ADDITIONAL_FIELDS]);
		expect(props[0]).toEqual({
			displayName: 'Invoice ID',
			name: 'invoiceId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: showFor('act_get', 1) },
		});
		// URL inputs have no routing.
		expect(props[0].routing).toBeUndefined();
		expect(props[1]).toMatchObject({
			displayName: 'Additional Fields',
			type: 'collection',
			default: {},
			displayOptions: { show: showFor('act_get', 1) },
		});
		expect(props[1].options?.[0]).toMatchObject({
			name: 'includeLines',
			type: 'boolean',
			routing: {
				send: { type: 'query', property: 'include_lines', propertyInDotNotation: false },
			},
		});
		expect(props[1].options?.[0]).toEqual({
			displayName: 'Include Lines',
			name: 'includeLines',
			type: 'boolean',
			default: false,
			routing: {
				send: { type: 'query', property: 'include_lines', propertyInDotNotation: false },
			},
		});
	});

	it('emits no collection when every input is required', () => {
		const props = buildInputProperties(createV1, showFor('act_create', 1));
		expect(props.map((prop) => prop.name)).toEqual(['amount', 'customerId']);
	});

	it('routes a body input with a nested key', () => {
		expect(bodyProp('lineItems0Price').routing).toEqual({
			send: { type: 'body', property: 'line_items[0].price', value: '={{ $value }}' },
		});
		expect(bodyProp('lineItems0Price').default).toBe(0);
	});

	it('routes a header input', () => {
		expect(bodyProp('idempotencyKey').routing).toEqual({
			request: { headers: { 'Idempotency-Key': '={{ $value }}' } },
		});
	});

	it('sends the parsed value of a JSON input', () => {
		expect(bodyProp('metadata')).toMatchObject({ type: 'json', default: '{}' });
		expect(bodyProp('metadata').routing).toEqual({
			send: {
				type: 'body',
				property: 'metadata',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		});
	});

	it('copies the options and the default of an options input', () => {
		expect(bodyProp('currency')).toMatchObject({
			type: 'options',
			default: 'eur',
			options: [
				{ name: 'Euro', value: 'eur' },
				{ name: 'Dollar', value: 'usd' },
			],
		});
	});

	it('shows the required inputs and the collection only for the given version', () => {
		for (const prop of v2Props) {
			expect(prop.displayOptions).toEqual({ show: showFor('act_create', 2) });
		}
	});

	it('throws when an input has no target', () => {
		const version: ActionVersionView = {
			...createV1,
			request: { ...createV1.request, inputTargets: { amount: { target: 'body', key: 'amount' } } },
		};
		expect(() => buildInputProperties(version, showFor('act_create', 1))).toThrow(UnexpectedError);
	});

	it.each([
		['default', { default: '={{ $credentials.token }}' }],
		['option value', { type: 'options' as const, options: [{ name: 'A', value: '={{ 1 }}' }] }],
	])('throws for an expression in the %s of an input', (_where, patch) => {
		const version: ActionVersionView = {
			...createV1,
			inputs: [{ ...createV1.inputs[0], ...patch }, createV1.inputs[1]],
		};
		expect(() => buildInputProperties(version, showFor('act_create', 1))).toThrow(UnexpectedError);
	});
});

describe('URL encoding (Review Focus 1)', () => {
	function resolveUrl(description: INodeTypeDescription, url: string, parameters: INodeParameters) {
		const nodeType: INodeType = { description };
		const nodeTypes: INodeTypes = {
			getByName: () => nodeType,
			getByNameAndVersion: () => nodeType,
			getKnownTypes: () => ({}),
		};
		const nodeName = 'Acme Billing';
		const workflow = new Workflow({
			id: 'wf',
			nodes: [
				{
					id: 'node-1',
					name: nodeName,
					type: `n8n-custom.${description.name}`,
					typeVersion: 1,
					position: [0, 0],
					parameters,
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		return workflow.expression.getParameterValue(url, null, 0, 0, nodeName, [], 'manual', {});
	}

	it('encodes URL input values so that they cannot change the path or the host', () => {
		const option = optionFor(d, 'act_get', 1);
		const url = option.routing?.request?.url;
		if (typeof url !== 'string') throw new Error('no url');

		const resolved = resolveUrl(d, url, {
			operation: option.value,
			invoiceId: '../../admin?x=1#y',
		});

		expect(resolved).toBe('/invoices/..%2F..%2Fadmin%3Fx%3D1%23y');
	});

	it('does not evaluate an expression-like input value', () => {
		const option = optionFor(d, 'act_get', 1);
		const url = option.routing?.request?.url;
		if (typeof url !== 'string') throw new Error('no url');

		const resolved = resolveUrl(d, url, {
			operation: option.value,
			invoiceId: '{{ 1 + 1 }}',
		});

		expect(resolved).toBe('/invoices/%7B%7B%201%20%2B%201%20%7D%7D');
	});

	it('resolves an optional URL input from the collection, and an empty string without it', () => {
		const version: ActionVersionView = {
			version: 1,
			inputs: [{ name: 'folder', displayName: 'Folder', type: 'string', required: false }],
			request: {
				method: 'GET',
				url: '/folders/{folder}/items',
				headers: {},
				query: {},
				bodyType: 'none',
				body: {},
				inputTargets: { folder: { target: 'url', key: 'folder' } },
			},
		};
		const generated = generateCustomNodeDescription(node, [
			{ id: 'act_list', name: 'List', versions: [version] },
		]);
		const option = optionFor(generated, 'act_list', 1);
		const url = option.routing?.request?.url;
		if (typeof url !== 'string') throw new Error('no url');

		expect(
			resolveUrl(generated, url, {
				operation: option.value,
				[ADDITIONAL_FIELDS]: { folder: 'a/b' },
			}),
		).toBe('/folders/a%2Fb/items');
		expect(resolveUrl(generated, url, { operation: option.value })).toBe('/folders//items');
	});
});
