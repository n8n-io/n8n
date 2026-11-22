import { UnexpectedError } from '@n8n/errors';
import type {
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';

import { CUSTOM_API_CALL_KEY } from '@/constants';

import { buildRequest, paramPathFor } from '../node-description.generator';
import {
	CUSTOM_RESOURCE_NAME,
	CUSTOM_RESOURCE_VALUE,
	PARENT_INPUT_PREFIX,
	PARENT_NAMING,
	buildParentRuntimeDescription,
	extendParentDescription,
	isCustomActionSelected,
	parentPinValues,
	parentShape,
} from '../parent-action.generator';
import {
	OPERATION_PARAMETER,
	PIN_ACTION_ID_PARAMETER,
	PIN_ACTION_NAME_PARAMETER,
	operationOptions,
	pinValues,
	showFor,
} from '../version-pin';
import {
	declarativeParent,
	listPayouts,
	operationParent,
	refundPayment,
	resourceParent,
} from './parent-node.fixture';

const actions = [refundPayment, listPayouts];
const refs = actions.map((action) => ({
	id: action.id,
	name: action.name,
	...(action.description !== undefined && { description: action.description }),
	versions: action.versions.map((v) => v.version),
}));

const valueOf = (actionId: string, version: number) => {
	const [value] = showFor(actionId, version)[OPERATION_PARAMETER] ?? [];
	return value;
};

const isOption = (value: unknown): value is INodePropertyOptions =>
	typeof value === 'object' && value !== null && 'value' in value && !('type' in value);

const optionsOf = (property: INodeProperties) => (property.options ?? []).filter(isOption);

const named = (description: INodeTypeDescription, name: string) =>
	description.properties.filter((property) => property.name === name);

const customProperties = (description: INodeTypeDescription) =>
	description.properties.filter((property) => property.name.startsWith(PARENT_INPUT_PREFIX));

function withProperties(
	description: INodeTypeDescription,
	properties: INodeProperties[],
): INodeTypeDescription {
	return { ...description, properties };
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}

const NODE = { typeVersion: 1 };

describe('parentShape', () => {
	it.each([
		['a parent with resource and operation', resourceParent, 'resource'],
		['a declarative parent with resource', declarativeParent, 'resource'],
		['a parent with only operation', operationParent, 'operation'],
	])('accepts %s', (_label, description, shape) => {
		expect(parentShape(description)).toBe(shape);
	});

	const operationProperty = operationParent.properties[1];

	it.each<[string, INodeTypeDescription]>([
		['a trigger group', { ...resourceParent, group: ['trigger'] }],
		['a polling node', { ...resourceParent, polling: true }],
		[
			'a node with webhooks',
			{
				...resourceParent,
				webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'x' }],
			},
		],
		[
			'two main outputs',
			{ ...resourceParent, outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main] },
		],
		['an ai_tool output', { ...resourceParent, outputs: [NodeConnectionTypes.AiTool] }],
		['computed inputs', { ...resourceParent, inputs: '={{ ["main"] }}' }],
		['no credentials', { ...resourceParent, credentials: [] }],
		[
			'a credential shown by resource',
			{
				...resourceParent,
				credentials: [
					{ name: 'acmeBillingApi', displayOptions: { show: { resource: ['invoice'] } } },
				],
			},
		],
		[
			'two credentials without authentication conditions',
			{ ...operationParent, credentials: [{ name: 'acmeLedgerApi' }, { name: 'acmeOtherApi' }] },
		],
		[
			'a property named customAction_x',
			withProperties(resourceParent, [
				...resourceParent.properties,
				{ displayName: 'X', name: 'customAction_x', type: 'string', default: '' },
			]),
		],
		[
			'a property named customActionId',
			withProperties(operationParent, [
				...operationParent.properties,
				{ displayName: 'ID', name: 'customActionId', type: 'hidden', default: '' },
			]),
		],
		[
			'no resource and no operation',
			withProperties(operationParent, [operationParent.properties[2]]),
		],
		[
			'an operation of type string',
			withProperties(operationParent, [
				{ displayName: 'Operation', name: 'operation', type: 'string', default: 'get' },
			]),
		],
		[
			'an operation option value that reads as a pin',
			withProperties(operationParent, [
				{
					...operationProperty,
					options: [...optionsOf(operationProperty), { name: 'Export V2', value: 'export@2' }],
				},
			]),
		],
	])('rejects %s', (_label, description) => {
		expect(parentShape(description)).toBeUndefined();
	});
});

describe('extendParentDescription', () => {
	const extendedResource = extendParentDescription(resourceParent, 'resource', actions);
	const extendedOperation = extendParentDescription(operationParent, 'operation', actions);
	const extendedDeclarative = extendParentDescription(declarativeParent, 'resource', actions);

	describe('without actions', () => {
		const emptyResource = extendParentDescription(resourceParent, 'resource', []);
		const emptyOperation = extendParentDescription(operationParent, 'operation', []);

		it('adds no Custom resource option and an Action property without options', () => {
			expect(emptyResource).not.toBe(resourceParent);
			expect(named(emptyResource, 'resource')).toEqual([resourceParent.properties[0]]);
			const custom = named(emptyResource, OPERATION_PARAMETER).filter((property) =>
				property.displayOptions?.show?.resource?.includes(CUSTOM_RESOURCE_VALUE),
			);
			expect(custom).toEqual([
				{
					displayName: 'Action',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					default: '',
					options: [],
					displayOptions: { show: { resource: ['__CUSTOM_ACTION__'] } },
				},
			]);
			expect(customProperties(emptyResource)).toEqual([]);
		});

		it('keeps the operation of a parent without resource and adds the pins', () => {
			expect(emptyOperation).not.toBe(operationParent);
			expect(named(emptyOperation, OPERATION_PARAMETER)).toEqual([operationParent.properties[1]]);
			expect(emptyOperation.properties.map((property) => property.name)).toEqual([
				...operationParent.properties.map((property) => property.name),
				PIN_ACTION_ID_PARAMETER,
				PIN_ACTION_NAME_PARAMETER,
			]);
		});

		it.each<[string, INodeTypeDescription, INodeParameters]>([
			[
				'resource',
				emptyResource,
				parentPinValues('resource', { actionId: 'act_gone', actionName: 'Gone', version: 1 }),
			],
			[
				'operation',
				emptyOperation,
				pinValues({ actionId: 'act_gone', actionName: 'Gone', version: 1 }),
			],
		])(
			'keeps the selection of a missing action in the %s shape when the parameters are resolved',
			(_shape, description, params) => {
				const resolved = NodeHelpers.getNodeParameters(
					description.properties,
					params,
					true,
					false,
					null,
					description,
				);
				expect(resolved).toMatchObject(params);
			},
		);
	});

	it('does not change the parent description', () => {
		for (const [parent, shape] of [
			[resourceParent, 'resource'],
			[operationParent, 'operation'],
			[declarativeParent, 'resource'],
		] as const) {
			const clone = structuredClone(parent);
			const frozen = deepFreeze(structuredClone(parent));
			extendParentDescription(frozen, shape, actions);
			expect(frozen).toEqual(clone);
		}
	});

	it('returns a description that survives JSON serialization unchanged', () => {
		for (const extended of [extendedResource, extendedOperation, extendedDeclarative]) {
			// The test is about a JSON round trip, so `deepCopy` is not a replacement.
			// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
			expect(JSON.parse(JSON.stringify(extended))).toStrictEqual(extended);
		}
	});

	it('adds the Custom resource before the Custom API Call option', () => {
		const [resource] = named(extendedDeclarative, 'resource');
		expect(optionsOf(resource).map((option) => option.value)).toEqual([
			'payment',
			CUSTOM_RESOURCE_VALUE,
			CUSTOM_API_CALL_KEY,
		]);
		expect(optionsOf(resource)[1]).toEqual({ name: 'Custom', value: '__CUSTOM_ACTION__' });
		expect(CUSTOM_RESOURCE_NAME).toBe('Custom');

		// Without a Custom API Call option, the Custom resource is the last option.
		const [plain] = named(extendedResource, 'resource');
		expect(optionsOf(plain).map((option) => option.value)).toEqual([
			'invoice',
			'customer',
			'__CUSTOM_ACTION__',
		]);
		expect(plain.default).toBe('invoice');
	});

	it('adds one Action property for the Custom resource with an empty default', () => {
		const custom = named(extendedResource, OPERATION_PARAMETER).filter((property) =>
			property.displayOptions?.show?.resource?.includes(CUSTOM_RESOURCE_VALUE),
		);
		expect(custom).toEqual([
			{
				displayName: 'Action',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: '',
				options: operationOptions(refs),
				displayOptions: { show: { resource: ['__CUSTOM_ACTION__'] } },
			},
		]);
		// The operation properties of the parent stay as they are.
		expect(named(extendedResource, OPERATION_PARAMETER)).toHaveLength(3);
		expect(named(extendedResource, OPERATION_PARAMETER)[0]).toBe(resourceParent.properties[1]);
	});

	it('appends the actions to the operation of a parent without resource and keeps its default', () => {
		const [operation] = named(extendedOperation, OPERATION_PARAMETER);
		const parentOperation = operationParent.properties[1];
		expect(named(extendedOperation, OPERATION_PARAMETER)).toHaveLength(1);
		expect(operation).toEqual({
			...parentOperation,
			options: [...(parentOperation.options ?? []), ...operationOptions(refs)],
		});
		expect(operation.default).toBe('get');
		expect(named(extendedOperation, 'resource')).toEqual([]);
	});

	it('adds the two hidden pin parameters one time', () => {
		for (const extended of [extendedResource, extendedOperation, extendedDeclarative]) {
			for (const name of [PIN_ACTION_ID_PARAMETER, PIN_ACTION_NAME_PARAMETER]) {
				const pins = named(extended, name);
				expect(pins).toHaveLength(1);
				expect(pins[0]).toMatchObject({ type: 'hidden', default: '' });
			}
		}
	});

	it('shows the pins for the Custom resource only, and always in a parent without resource', () => {
		for (const extended of [extendedResource, extendedDeclarative]) {
			for (const name of [PIN_ACTION_ID_PARAMETER, PIN_ACTION_NAME_PARAMETER]) {
				expect(named(extended, name)[0].displayOptions).toEqual({
					show: { resource: ['__CUSTOM_ACTION__'] },
				});
			}
		}
		for (const name of [PIN_ACTION_ID_PARAMETER, PIN_ACTION_NAME_PARAMETER]) {
			expect(named(extendedOperation, name)[0].displayOptions).toBeUndefined();
		}

		// A built-in node of a resource parent gets no pin parameters.
		const resolved = NodeHelpers.getNodeParameters(
			extendedResource.properties,
			{ resource: 'invoice', operation: 'get', invoiceId: 'inv_1' },
			true,
			false,
			null,
			extendedResource,
		);
		expect(resolved).not.toHaveProperty(PIN_ACTION_ID_PARAMETER);
		expect(resolved).not.toHaveProperty(PIN_ACTION_NAME_PARAMETER);
	});

	it('gives each input the prefix customAction_ and puts optional inputs in customAction_additionalFields', () => {
		expect(customProperties(extendedOperation).map((property) => property.name)).toEqual([
			'customAction_paymentId',
			'customAction_paymentId',
			'customAction_additionalFields',
			'customAction_limit',
		]);
		const [collection] = named(extendedOperation, 'customAction_additionalFields');
		expect(collection).toMatchObject({ type: 'collection', default: {} });
		expect((collection.options ?? []).map((option) => option.name)).toEqual(['reason']);
		expect(collection.displayOptions).toEqual({ show: showFor('act_refund', 2) });

		const [required] = named(extendedResource, 'customAction_paymentId');
		expect(required.displayOptions).toEqual({
			show: { resource: ['__CUSTOM_ACTION__'], ...showFor('act_refund', 1) },
		});
	});

	it('keeps a parent parameter and a custom input of the same name apart', () => {
		const params: INodeParameters = {
			operation: valueOf('act_payouts', 1),
			limit: 10,
			customAction_limit: 5,
		};
		const resolved = NodeHelpers.getNodeParameters(
			extendedOperation.properties,
			params,
			false,
			false,
			null,
			extendedOperation,
		);
		expect(resolved?.limit).toBe(10);
		expect(resolved?.customAction_limit).toBe(5);
	});

	it('shows the inputs of version 1 only to a node that is pinned to version 1', () => {
		const pinned = { resource: CUSTOM_RESOURCE_VALUE, operation: valueOf('act_refund', 1) };
		const shown = customProperties(extendedResource).filter((property) =>
			NodeHelpers.displayParameter(pinned, property, NODE, extendedResource),
		);
		expect(shown).toHaveLength(1);
		expect(shown[0]).toMatchObject({ name: 'customAction_paymentId' });
		expect(shown[0].displayOptions?.show?.operation).toEqual([valueOf('act_refund', 1)]);

		// The inputs need the Custom resource too.
		const builtIn = { ...pinned, resource: 'invoice' };
		expect(
			customProperties(extendedResource).filter((property) =>
				NodeHelpers.displayParameter(builtIn, property, NODE, extendedResource),
			),
		).toEqual([]);
	});

	it('offers only the newest version to a new node', () => {
		const [operation] = named(extendedOperation, OPERATION_PARAMETER);
		const fresh = { operation: 'get' };
		const offered = optionsOf(operation)
			.filter((option) => NodeHelpers.displayParameter(fresh, option, NODE, extendedOperation))
			.map((option) => option.value);
		expect(offered).toEqual(['get', 'export', valueOf('act_refund', 2), valueOf('act_payouts', 1)]);
	});
});

describe('buildParentRuntimeDescription', () => {
	const runtime = buildParentRuntimeDescription(declarativeParent, actions);
	const extended = extendParentDescription(declarativeParent, 'resource', actions);

	it('sets userDefinedEndpoint and has no base URL', () => {
		expect(runtime.userDefinedEndpoint).toBe(true);
		expect(runtime.requestDefaults).toEqual({ json: true });
	});

	it('keeps the credentials of the parent', () => {
		expect(runtime.credentials).toEqual(declarativeParent.credentials);
		const fromOperationParent = buildParentRuntimeDescription(operationParent, actions);
		expect(fromOperationParent.credentials).toEqual(operationParent.credentials);
		expect(fromOperationParent).toMatchObject({
			displayName: operationParent.displayName,
			name: operationParent.name,
			group: operationParent.group,
			version: operationParent.version,
			description: operationParent.description,
			defaults: operationParent.defaults,
			inputs: operationParent.inputs,
			outputs: operationParent.outputs,
		});
	});

	it('holds only custom action properties, with the parameter names of the extended description', () => {
		const names = runtime.properties.map((property) => property.name);
		expect(names).toEqual([
			OPERATION_PARAMETER,
			PIN_ACTION_ID_PARAMETER,
			PIN_ACTION_NAME_PARAMETER,
			'customAction_paymentId',
			'customAction_paymentId',
			'customAction_additionalFields',
			'customAction_limit',
		]);
		expect(customProperties(runtime).map((property) => property.name)).toEqual(
			customProperties(extended).map((property) => property.name),
		);
		// No resource condition: the run-time description has no resource property.
		for (const property of customProperties(runtime)) {
			expect(Object.keys(property.displayOptions?.show ?? {})).toEqual([OPERATION_PARAMETER]);
		}
		expect(runtime.properties[0]).toMatchObject({ default: '', noDataExpression: true });
	});

	it('puts the absolute URL and the encoded URL inputs in the request of each option', () => {
		const options = optionsOf(runtime.properties[0]);
		expect(options.map((option) => option.value)).toEqual(
			operationOptions(refs).map((option) => option.value),
		);
		for (const action of actions) {
			for (const version of action.versions) {
				const option = options.find((o) => o.value === valueOf(action.id, version.version));
				expect(option?.routing).toEqual({
					request: buildRequest(version, paramPathFor(version, PARENT_NAMING)),
				});
			}
		}
		const refund = options.find((o) => o.value === valueOf('act_refund', 1));
		expect(refund?.routing?.request?.url).toMatch(/^=https:\/\/api\.acme\.test\/v1\/payments\//);
		expect(refund?.routing?.request?.url).toContain('$parameter["customAction_paymentId"]');
		const payouts = options.find((o) => o.value === valueOf('act_payouts', 1));
		expect(payouts?.routing?.request?.url).toBe('https://api.acme.test/v1/payouts');
	});

	it('throws when no action has a version', () => {
		expect(() => buildParentRuntimeDescription(declarativeParent, [])).toThrow(UnexpectedError);
	});
});

describe('parentPinValues', () => {
	const ref = { actionId: 'act_refund', actionName: 'Refund Payment', version: 2 };

	it('adds the resource value for the shape resource', () => {
		expect(parentPinValues('resource', ref)).toEqual({
			resource: '__CUSTOM_ACTION__',
			...pinValues(ref),
		});
	});

	it('is equal to pinValues for the shape operation', () => {
		expect(parentPinValues('operation', ref)).toEqual(pinValues(ref));
	});
});

describe('isCustomActionSelected', () => {
	it.each<[string, 'resource' | 'operation', INodeParameters, boolean]>([
		[
			'resource shape with the Custom resource',
			'resource',
			{ resource: '__CUSTOM_ACTION__' },
			true,
		],
		['resource shape with a built-in resource', 'resource', { resource: 'invoice' }, false],
		[
			'operation shape with a served pin',
			'operation',
			{ operation: valueOf('act_refund', 1) },
			true,
		],
		['operation shape with a built-in operation', 'operation', { operation: 'get' }, false],
		[
			'operation shape with an unknown pin and a matching customActionId',
			'operation',
			{ operation: valueOf('act_gone', 3), customActionId: 'act_gone' },
			true,
		],
		[
			'operation shape with an unknown pin and no customActionId',
			'operation',
			{ operation: valueOf('act_gone', 3) },
			true,
		],
	])('%s', (_label, shape, parameters, expected) => {
		expect(isCustomActionSelected(shape, parameters)).toBe(expected);
	});
});
