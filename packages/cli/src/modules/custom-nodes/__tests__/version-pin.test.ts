import type {
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import {
	OPERATION_PARAMETER,
	operationOptions,
	pinProperties,
	pinValues,
	readPin,
	showFor,
} from '../version-pin';

type TestAction = { id: string; name: string; versions: number[] };

const node = { typeVersion: 1 };

/** Input properties for each version. Version 2 adds a field, so the contracts differ. */
const inputsFor = (actionId: string, version: number): INodeProperties[] => {
	const show = showFor(actionId, version);
	const inputs: INodeProperties[] = [
		{
			displayName: 'Invoice ID',
			name: 'invoiceId',
			type: 'string',
			default: '',
			displayOptions: { show },
		},
	];
	if (version >= 2) {
		inputs.push({
			displayName: 'Include Lines',
			name: 'includeLines',
			type: 'boolean',
			default: false,
			displayOptions: { show },
		});
	}
	if (version >= 3) {
		inputs.push({
			displayName: 'Currency',
			name: 'currency',
			type: 'string',
			default: 'EUR',
			displayOptions: { show },
		});
	}
	return inputs;
};

/** Builds a description the same way the description generator will. */
const buildDescription = (actions: TestAction[]): INodeTypeDescription => ({
	displayName: 'Test Parent',
	name: 'n8n-custom.testParent',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'Test Parent' },
	inputs: [],
	outputs: [],
	properties: [
		{
			displayName: 'Operation',
			name: OPERATION_PARAMETER,
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Get', value: 'get', action: 'Get a record' },
				...operationOptions(actions),
			],
			// The default must never be a custom action value. See the "Mechanism" notes.
			default: 'get',
		},
		...pinProperties(actions),
		...actions.flatMap((action) => action.versions.flatMap((v) => inputsFor(action.id, v))),
	],
});

const invoiceV12: TestAction = { id: 'a1', name: 'Get Invoice', versions: [1, 2] };
const invoiceV123: TestAction = { id: 'a1', name: 'Get Invoice', versions: [1, 2, 3] };

/**
 * Models the editor call sites:
 * - save: `serializeNode` in `app/utils/nodes/nodeTransforms.ts` and the first call in
 *   `useNodeSettingsParameters.ts` (returnDefaults false, returnNoneDisplayed false).
 * - open: `resolveNodeParameters` in `app/composables/useWorkflowNormalization.ts` (load, paste,
 *   import, add from the nodes panel), `setLastNodeParameters` in
 *   `useWorkflowDocumentNodes.ts`, `getParameterDisplayableOptions`, and the `Workflow`
 *   constructor at run time (returnDefaults true, returnNoneDisplayed false).
 */
const saved = (description: INodeTypeDescription, params: INodeParameters) =>
	NodeHelpers.getNodeParameters(description.properties, params, false, false, node, description) ??
	{};
const opened = (description: INodeTypeDescription, params: INodeParameters) =>
	NodeHelpers.getNodeParameters(description.properties, params, true, false, node, description) ??
	{};
/** Open, save, then open again: a reload, a copy and paste, or an export and import. */
const roundTrip = (description: INodeTypeDescription, params: INodeParameters) =>
	opened(description, saved(description, opened(description, params)));

/** Models `getParameterDisplayableOptions` in `app/utils/nodes/nodeTransforms.ts`. */
const visibleOperationValues = (description: INodeTypeDescription, params: INodeParameters) => {
	const resolved = opened(description, params);
	const operation = description.properties.find((p) => p.name === OPERATION_PARAMETER);
	const options = (operation?.options ?? []) as INodePropertyOptions[];
	return options
		.filter((option) => NodeHelpers.displayParameter(resolved, option, node, description))
		.map((option) => option.value);
};

const visiblePropertyNames = (description: INodeTypeDescription, params: INodeParameters) => {
	const resolved = opened(description, params);
	return description.properties
		.filter((p) => p.type !== 'hidden')
		.filter((p) => NodeHelpers.displayParameter(resolved, p, node, description))
		.map((p) => p.name);
};

const pinV1 = { actionId: 'a1', actionName: 'Get Invoice', version: 1 };
const pinV2 = { actionId: 'a1', actionName: 'Get Invoice', version: 2 };

describe('version pin', () => {
	it('keeps a node on version 1 after a save that strips default values', () => {
		const description = buildDescription([invoiceV12]);
		const params = { ...pinValues(pinV1), invoiceId: 'inv_1' };

		expect(readPin(saved(description, params))).toEqual(pinV1);
		expect(readPin(roundTrip(description, params))).toEqual(pinV1);

		// A node on the newest version must keep its pin too, also with no input values.
		expect(readPin(saved(description, opened(description, pinValues(pinV2))))).toEqual(pinV2);
		expect(readPin(roundTrip(description, pinValues(pinV2)))).toEqual(pinV2);
	});

	it('keeps the pin when version 3 is added later', () => {
		const before = buildDescription([invoiceV12]);
		const after = buildDescription([invoiceV123]);

		for (const pin of [pinV1, pinV2]) {
			const stored = saved(before, opened(before, { ...pinValues(pin), invoiceId: 'inv_1' }));

			expect(readPin(stored)).toEqual(pin);
			expect(readPin(opened(after, stored))).toEqual(pin);
			expect(readPin(roundTrip(after, stored))).toEqual(pin);
			expect(roundTrip(after, stored).invoiceId).toBe('inv_1');
		}

		// The node that was on the newest version must not see the fields of version 3.
		const storedV2 = saved(before, opened(before, pinValues(pinV2)));
		expect(visiblePropertyNames(after, storedV2)).toEqual([
			OPERATION_PARAMETER,
			'invoiceId',
			'includeLines',
		]);
	});

	it('shows only the properties of the pinned version', () => {
		const description = buildDescription([invoiceV12]);
		const v1Props = inputsFor('a1', 1);
		const v2Props = inputsFor('a1', 2);
		const stored = roundTrip(description, { ...pinValues(pinV1), invoiceId: 'inv_1' });

		for (const prop of v1Props) {
			expect(NodeHelpers.displayParameter(stored, prop, node, description)).toBe(true);
		}
		for (const prop of v2Props) {
			// v2 has its own copy of `invoiceId`. Only the v1 copy is visible.
			expect(NodeHelpers.displayParameter(stored, prop, node, description)).toBe(false);
		}
		expect(visiblePropertyNames(description, stored)).toEqual([OPERATION_PARAMETER, 'invoiceId']);
		expect(stored).not.toHaveProperty('includeLines');
	});

	it('offers only the newest version to a node without a pin', () => {
		const description = buildDescription([invoiceV12]);

		expect(visibleOperationValues(description, {})).toEqual(['get', 'a1@2']);
		expect(visibleOperationValues(description, { operation: 'get' })).toEqual(['get', 'a1@2']);

		// A node pinned to version 1 sees its own version, not a second entry for the same action.
		expect(visibleOperationValues(description, pinValues(pinV1))).toEqual(['get', 'a1@1']);

		// After version 3 is added, new nodes get version 3 and a node on version 2 keeps version 2.
		const after = buildDescription([invoiceV123]);
		expect(visibleOperationValues(after, {})).toEqual(['get', 'a1@3']);
		expect(visibleOperationValues(after, pinValues(pinV2))).toEqual(['get', 'a1@2']);
	});

	it('returns the action name for an action that no longer exists', () => {
		const withAction = buildDescription([invoiceV12]);
		const withoutAction = buildDescription([]);
		const stored = saved(withAction, opened(withAction, { ...pinValues(pinV1), invoiceId: 'x' }));

		expect(readPin(stored)).toEqual(pinV1);
		expect(readPin(saved(withoutAction, stored))).toEqual(pinV1);
		expect(readPin(opened(withoutAction, stored))).toEqual(pinV1);
	});

	it('returns undefined when a built-in operation is selected', () => {
		expect(readPin({ operation: 'get' })).toBeUndefined();
		expect(readPin({})).toBeUndefined();
		expect(readPin({ operation: 'a1@0' })).toBeUndefined();
		expect(readPin({ operation: '@1' })).toBeUndefined();
		// A name that belongs to another action is not used. The id is the fallback.
		expect(readPin({ ...pinValues(pinV1), operation: 'a2@4' })).toEqual({
			actionId: 'a2',
			actionName: 'a2',
			version: 4,
		});
	});
});
