import type { Logger } from '@n8n/backend-common';
import type { ExecuteContext } from 'n8n-core';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError, deepCopy } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { convertNodeToAiTool } from '@/tool-generation';

import type { ActionView } from '../node-description.generator';
import { CUSTOM_RESOURCE_VALUE, parentPinValues } from '../parent-action.generator';
import { ParentActionsProvider } from '../parent-actions.provider';
import { listPayouts, operationParent, refundPayment, resourceParent } from './parent-node.fixture';

/** Descriptions that the copy gives to `RoutingNode`. No request is sent. */
const routed = vi.hoisted(() => ({ descriptions: [] as INodeTypeDescription[] }));

vi.mock('n8n-core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('n8n-core')>();
	class FakeRoutingNode {
		constructor(_context: unknown, nodeType: { description: INodeTypeDescription }) {
			routed.descriptions.push(nodeType.description);
		}

		async runNode() {
			return [[{ json: { routed: true } }]];
		}
	}
	return { ...actual, RoutingNode: FakeRoutingNode };
});

const BILLING = 'n8n-nodes-base.acmeBilling';
const LEDGER = 'n8n-nodes-base.acmeLedger';

const served = (description: INodeTypeDescription): INodeTypeDescription => ({
	...description,
	name: `n8n-nodes-base.${description.name}`,
});

const ALL_CREDENTIALS = ['acmeBillingApi', 'acmeLedgerApi', 'acmeLedgerOAuth2Api'];

function createProvider(nodes: INodeTypeDescription[], supported = ALL_CREDENTIALS) {
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	loadNodesAndCredentials.types = { nodes, credentials: [] };
	// As the real check: true when any credential of the description supports proxy auth.
	loadNodesAndCredentials.supportsProxyAuth.mockImplementation((description) =>
		(description.credentials ?? []).some(({ name }) => supported.includes(name)),
	);
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const provider = new ParentActionsProvider(loadNodesAndCredentials, logger);
	return { provider, loadNodesAndCredentials, logger };
}

const builtInResult = [[{ json: { builtIn: true } }]];

function loadedType(description: INodeTypeDescription) {
	return {
		description,
		execute: vi.fn(async function () {
			return builtInResult;
		}),
	};
}

async function run(type: INodeType, parameters: INodeParameters) {
	const node = mock<INode>({ name: 'Acme', parameters });
	const context = mock<ExecuteContext>();
	context.getNode.mockReturnValue(node);
	if (!type.execute) throw new Error('The node type has no execute');
	return await type.execute.call(context);
}

const refundV1 = parentPinValues('resource', {
	actionId: 'act_refund',
	actionName: 'Refund Payment',
	version: 1,
});

const actionsOf = (entries: Array<[string, ActionView[]]>) => new Map(entries);

const withProperties = (
	description: INodeTypeDescription,
	properties: INodeProperties[],
): INodeTypeDescription => ({ ...description, properties });

describe('ParentActionsProvider', () => {
	beforeEach(() => {
		routed.descriptions = [];
	});

	it('gives the same custom properties in the served types, in extendDescription, and in the run-time copy', () => {
		const { provider, loadNodesAndCredentials } = createProvider([served(resourceParent)]);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));
		const before = loadNodesAndCredentials.types.nodes;

		provider.transformTypes();

		const [servedEntry] = loadNodesAndCredentials.types.nodes;
		expect(loadNodesAndCredentials.types.nodes).not.toBe(before);
		expect(servedEntry.name).toBe(BILLING);
		expect(before[0].properties).toEqual(resourceParent.properties);

		const extended = provider.extendDescription(BILLING, resourceParent);
		const copy = provider.extendNodeType(BILLING, loadedType(resourceParent));

		expect(JSON.stringify(extended.properties)).toContain('act_refund');
		expect(servedEntry.properties).toEqual(extended.properties);
		expect(copy.description).toEqual(extended);
	});

	it('does not extend a node whose credential does not support declarative requests', () => {
		const entry = served(resourceParent);
		const { provider, loadNodesAndCredentials } = createProvider([entry], []);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));

		provider.transformTypes();

		expect(loadNodesAndCredentials.types.nodes[0]).toBe(entry);
		expect(provider.extendDescription(BILLING, resourceParent)).toBe(resourceParent);
		const loaded = loadedType(resourceParent);
		expect(provider.extendNodeType(BILLING, loaded)).toBe(loaded);
		expect(provider.shapeOf(BILLING)).toBeUndefined();
	});

	it('does not extend a node when one of two credentials does not support declarative requests', () => {
		const entry = served(operationParent);
		const { provider, loadNodesAndCredentials } = createProvider([entry], ['acmeLedgerApi']);
		provider.setActions(actionsOf([[LEDGER, [listPayouts]]]));

		provider.transformTypes();

		expect(loadNodesAndCredentials.types.nodes[0]).toBe(entry);
		expect(provider.extendDescription(LEDGER, operationParent)).toBe(operationParent);
		expect(provider.eligibleParents()).toEqual([]);
		// Each credential is checked alone. Together, one supported credential would be enough.
		for (const [description] of loadNodesAndCredentials.supportsProxyAuth.mock.calls) {
			expect(description.credentials).toHaveLength(1);
		}
	});

	it('does not extend and does not list a Tool variant', () => {
		const entry = served({ ...resourceParent, usableAsTool: true });
		const tool = convertNodeToAiTool({ description: deepCopy(entry) }).description;
		expect(tool.name).toBe(`${BILLING}Tool`);
		const { provider, loadNodesAndCredentials } = createProvider([entry, tool]);
		provider.setActions(
			actionsOf([
				[BILLING, [refundPayment]],
				[tool.name, [refundPayment]],
			]),
		);

		provider.transformTypes();

		expect(loadNodesAndCredentials.types.nodes[1]).toBe(tool);
		expect(provider.shapeOf(tool.name)).toBeUndefined();
		expect(provider.eligibleParents()).toEqual([{ nodeType: BILLING, shape: 'resource' }]);
		expect(provider.extendDescription(tool.name, tool)).toBe(tool);
	});

	it('serves the pins of an eligible parent without actions, without a Custom resource option', () => {
		const entry = served(resourceParent);
		const { provider, loadNodesAndCredentials } = createProvider([entry]);
		provider.setActions(actionsOf([[LEDGER, [listPayouts]]]));

		provider.transformTypes();

		const [servedEntry] = loadNodesAndCredentials.types.nodes;
		expect(servedEntry).not.toBe(entry);
		expect(provider.shapeOf(BILLING)).toBe('resource');
		expect(servedEntry.properties).toEqual(
			provider.extendDescription(BILLING, resourceParent).properties,
		);
		expect(servedEntry.properties.map((property) => property.name)).toEqual([
			...resourceParent.properties.map((property) => property.name),
			'operation',
			'customActionId',
			'customActionName',
		]);
		expect(servedEntry.properties[0]).toBe(entry.properties[0]);
		expect(JSON.stringify(servedEntry.properties[0])).not.toContain(CUSTOM_RESOURCE_VALUE);
	});

	it('wraps an eligible parent without actions at run time', async () => {
		const { provider } = createProvider([served(resourceParent)]);
		provider.transformTypes();
		const loaded = loadedType(resourceParent);

		const copy = provider.extendNodeType(BILLING, loaded);

		expect(copy).not.toBe(loaded);
		expect(copy.description).toEqual(provider.extendDescription(BILLING, resourceParent));
		expect(await run(copy, { resource: 'invoice', operation: 'get' })).toBe(builtInResult);
		// A workflow can still select an action that was deleted. It must fail before a request.
		const error = await run(copy, refundV1).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as Error).message).toMatch(
			/^The action "Refund Payment" does not exist any more or is not available for this node/,
		);
		expect(routed.descriptions).toEqual([]);
		expect(loaded.execute).toHaveBeenCalledTimes(1);
	});

	describe('a stored action that cannot be built', () => {
		const [payoutsV1] = listPayouts.versions;
		// The request has no target for the input `limit`.
		const broken: ActionView = {
			id: 'act_broken',
			name: 'Broken Action',
			versions: [{ ...payoutsV1, request: { ...payoutsV1.request, inputTargets: {} } }],
		};
		const brokenPin = parentPinValues('resource', {
			actionId: 'act_broken',
			actionName: 'Broken Action',
			version: 1,
		});

		it('is skipped and logged once, and the other actions and the built-in operations still work', async () => {
			const { provider, loadNodesAndCredentials, logger } = createProvider([
				served(resourceParent),
			]);
			provider.setActions(actionsOf([[BILLING, [broken, refundPayment]]]));

			expect(() => provider.transformTypes()).not.toThrow();

			const [servedEntry] = loadNodesAndCredentials.types.nodes;
			const servedText = JSON.stringify(servedEntry.properties);
			expect(servedText).toContain('act_refund');
			expect(servedText).not.toContain('act_broken');

			const loaded = loadedType(resourceParent);
			const copy = provider.extendNodeType(BILLING, loaded);
			expect(await run(copy, { resource: 'invoice', operation: 'get' })).toBe(builtInResult);
			expect(await run(copy, { ...refundV1, customAction_paymentId: 'pay_1' })).toEqual([
				[{ json: { routed: true } }],
			]);
			await expect(run(copy, brokenPin)).rejects.toThrow(
				/^The action "Broken Action" does not exist any more/,
			);
			provider.extendDescription(BILLING, resourceParent);

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Skipped a custom action of a parent node with an invalid definition',
				expect.objectContaining({ actionId: 'act_broken', parentNodeType: BILLING }),
			);
			// The log holds no request template.
			expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('api.acme.test');
		});
	});

	it('serves a parent without its actions when the extension fails, and logs it once', async () => {
		const { provider, loadNodesAndCredentials, logger } = createProvider([served(resourceParent)]);
		const refund = structuredClone(refundPayment);
		provider.setActions(actionsOf([[BILLING, [refund]]]));
		// Simulates data that `setActions` accepted and that the generator rejects later.
		refund.versions[0].request.inputTargets = {};

		expect(() => provider.transformTypes()).not.toThrow();

		const [servedEntry] = loadNodesAndCredentials.types.nodes;
		expect(JSON.stringify(servedEntry.properties)).not.toContain('act_refund');
		expect(servedEntry.properties.map((property) => property.name)).toContain('customActionId');

		const loaded = loadedType(resourceParent);
		const copy = provider.extendNodeType(BILLING, loaded);
		expect(copy).not.toBe(loaded);
		expect(copy.description.properties).toEqual(servedEntry.properties);
		expect(await run(copy, { resource: 'invoice', operation: 'get' })).toBe(builtInResult);
		await expect(run(copy, refundV1)).rejects.toThrow(
			/^The action "Refund Payment" does not exist any more/,
		);
		expect(routed.descriptions).toEqual([]);

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			'Served a parent node without its custom actions',
			expect.objectContaining({ parentNodeType: BILLING }),
		);
	});

	describe('a parent field that blocks custom actions', () => {
		const requiredDomain: INodeProperties = {
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			required: true,
			default: '',
		};

		it('makes a parent with a required field for every operation not eligible', () => {
			const entry = served(
				withProperties(operationParent, [...operationParent.properties, requiredDomain]),
			);
			const { provider, loadNodesAndCredentials } = createProvider([entry]);
			provider.setActions(actionsOf([[LEDGER, [listPayouts]]]));

			provider.transformTypes();

			expect(provider.shapeOf(LEDGER)).toBeUndefined();
			expect(loadNodesAndCredentials.types.nodes[0]).toBe(entry);
		});

		it('keeps a parent eligible when the required field shows for built-in operations only', () => {
			const entry = served(
				withProperties(operationParent, [
					...operationParent.properties,
					{ ...requiredDomain, displayOptions: { show: { operation: ['get', 'export'] } } },
				]),
			);
			const { provider } = createProvider([entry]);

			provider.transformTypes();

			expect(provider.shapeOf(LEDGER)).toBe('operation');
		});
	});

	it('returns the node type itself for a node that is not eligible', () => {
		const trigger: INodeTypeDescription = { ...resourceParent, group: ['trigger'] };
		const { provider } = createProvider([served(trigger)]);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));
		provider.transformTypes();

		const loaded = loadedType(trigger);
		expect(provider.extendNodeType(BILLING, loaded)).toBe(loaded);
		expect(provider.extendDescription(BILLING, trigger)).toBe(trigger);
		const unknown = loadedType(operationParent);
		expect(provider.extendNodeType(LEDGER, unknown)).toBe(unknown);
	});

	it('extends only the versions that have the shape of the newest version', () => {
		// Version 1 has no `resource` property, so its shape is `operation`.
		const v1: INodeTypeDescription = {
			...resourceParent,
			version: [1, 1.1],
			properties: resourceParent.properties.filter((property) => property.name !== 'resource'),
		};
		const v2: INodeTypeDescription = { ...resourceParent, version: 2 };
		const v3: INodeTypeDescription = { ...resourceParent, version: [3, 3.1] };
		const entries = [served(v1), served(v3), served(v2)];
		const { provider, loadNodesAndCredentials } = createProvider(entries);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));

		provider.transformTypes();

		const [servedV1, servedV3, servedV2] = loadNodesAndCredentials.types.nodes;
		expect(servedV1).toBe(entries[0]);
		expect(servedV3).not.toBe(entries[1]);
		expect(servedV2).not.toBe(entries[2]);
		expect(provider.shapeOf(BILLING)).toBe('resource');

		expect(provider.extendDescription(BILLING, v1)).toBe(v1);
		expect(JSON.stringify(provider.extendDescription(BILLING, v2))).toContain('act_refund');
		const loadedV1 = loadedType(v1);
		expect(provider.extendNodeType(BILLING, loadedV1)).toBe(loadedV1);
		expect(JSON.stringify(provider.extendNodeType(BILLING, loadedType(v3)).description)).toContain(
			'act_refund',
		);
	});

	it('returns the cached copy until the actions change', () => {
		const { provider } = createProvider([served(resourceParent)]);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));
		provider.transformTypes();
		const loaded = loadedType(resourceParent);

		const first = provider.extendNodeType(BILLING, loaded);
		expect(provider.extendNodeType(BILLING, loaded)).toBe(first);

		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));
		const second = provider.extendNodeType(BILLING, loaded);
		expect(second).not.toBe(first);
		expect(provider.extendNodeType(BILLING, loaded)).toBe(second);

		provider.transformTypes();
		expect(provider.extendNodeType(BILLING, loaded)).not.toBe(second);
	});

	it('lets a running execution keep its copy after the actions change', async () => {
		const { provider } = createProvider([served(resourceParent)]);
		provider.setActions(actionsOf([[BILLING, [refundPayment]]]));
		provider.transformTypes();
		const loaded = loadedType(resourceParent);
		const first = provider.extendNodeType(BILLING, loaded);

		const [v1] = refundPayment.versions;
		const changed: ActionView = {
			...refundPayment,
			name: 'Refund Charge',
			versions: [{ ...v1, request: { ...v1.request, url: 'https://api.acme.test/v3/refund' } }],
		};
		provider.setActions(actionsOf([[BILLING, [changed]]]));
		const second = provider.extendNodeType(BILLING, loaded);

		expect(JSON.stringify(first.description)).toContain('Refund Payment');
		expect(JSON.stringify(first.description)).not.toContain('Refund Charge');
		expect(JSON.stringify(second.description)).toContain('Refund Charge');

		await run(first, { ...refundV1, customAction_paymentId: 'pay_1' });
		await run(second, { ...refundV1, customAction_paymentId: 'pay_1' });

		expect(routed.descriptions).toHaveLength(2);
		const [oldRouting, newRouting] = routed.descriptions.map((d) => JSON.stringify(d));
		expect(oldRouting).toContain('api.acme.test/v1/payments/');
		expect(oldRouting).not.toContain('/v3/refund');
		expect(newRouting).toContain('/v3/refund');
		expect(newRouting).not.toContain('api.acme.test/v1/payments/');
		expect(loaded.execute).not.toHaveBeenCalled();
	});

	it('lists the eligible parents with their shape', () => {
		const notEligible: INodeTypeDescription = { ...resourceParent, name: 'acmeTrigger' };
		notEligible.group = ['trigger'];
		const { provider } = createProvider([
			served(resourceParent),
			served(operationParent),
			served(notEligible),
		]);

		provider.transformTypes();

		expect(provider.eligibleParents()).toEqual([
			{ nodeType: BILLING, shape: 'resource' },
			{ nodeType: LEDGER, shape: 'operation' },
		]);
		expect(provider.shapeOf(LEDGER)).toBe('operation');
		expect(provider.shapeOf('n8n-nodes-base.acmeTrigger')).toBeUndefined();
		expect(provider.shapeOf('n8n-nodes-base.unknown')).toBeUndefined();
	});
});
