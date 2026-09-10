import {
	jsonParse,
	makeGetNodeTypeForGrouping,
	mapConnectionsByDestination,
	NodeConnectionTypes,
	type INodeTypeDescription,
	type INodeTypes,
} from 'n8n-workflow';

import {
	dropInvalidWorkflowJsonGroups,
	toEngineConnections,
	toGroupValidationNodes,
} from './workflow-json-engine-helpers';
import type { WorkflowJSON } from '../types/base';

function makeNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		displayName: overrides.displayName ?? 'Set',
		name: overrides.name ?? 'n8n-nodes-base.set',
		group: overrides.group ?? ['transform'],
		version: overrides.version ?? 1,
		description: overrides.description ?? '',
		defaults: overrides.defaults ?? { name: 'Set' },
		inputs: overrides.inputs ?? [NodeConnectionTypes.Main],
		outputs: overrides.outputs ?? [NodeConnectionTypes.Main],
		properties: overrides.properties ?? [],
		...overrides,
	};
}

function makeNode(
	id: string,
	name: string,
	type = 'n8n-nodes-base.set',
): WorkflowJSON['nodes'][number] {
	return {
		id,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function makeWorkflow(
	nodes: WorkflowJSON['nodes'],
	connections: WorkflowJSON['connections'] = {},
	nodeGroups?: WorkflowJSON['nodeGroups'],
): WorkflowJSON {
	return {
		name: 'Test workflow',
		nodes,
		connections,
		...(nodeGroups ? { nodeGroups } : {}),
	};
}

function makeNodeTypesProvider(): INodeTypes {
	const descriptions: Record<string, INodeTypeDescription> = {
		'n8n-nodes-base.set': makeNodeType(),
		'n8n-nodes-base.manualTrigger': makeNodeType({
			name: 'n8n-nodes-base.manualTrigger',
			group: ['trigger'],
		}),
		'@n8n/n8n-nodes-langchain.agent': makeNodeType({
			name: '@n8n/n8n-nodes-langchain.agent',
		}),
		'@n8n/n8n-nodes-langchain.lmChatOpenAi': makeNodeType({
			name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		}),
	};

	const getByNameAndVersion = (nodeType: string) => {
		const description = descriptions[nodeType];
		if (!description) throw new Error('Unknown node type');
		return { description };
	};

	return {
		getByName: getByNameAndVersion,
		getByNameAndVersion,
		getKnownTypes: () => ({}),
	};
}

describe('toEngineConnections', () => {
	it('skips connections whose type is not known to the engine', () => {
		const connections: WorkflowJSON['connections'] = {
			Source: {
				main: [[{ node: 'Target', type: 'unknown_type', index: 0 }]],
			},
		};

		expect(toEngineConnections(connections)).toEqual({ Source: { main: [[]] } });
	});

	it('skips unsafe source-node keys without polluting the prototype', () => {
		const connections = jsonParse<WorkflowJSON['connections']>(
			'{"__proto__":{"main":[[{"node":"Target","type":"main","index":0}]]},"Source":{"main":[[{"node":"Target","type":"main","index":0}]]}}',
		);

		const result = toEngineConnections(connections);

		expect(Object.hasOwn(result, '__proto__')).toBe(false);
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(result).toEqual({
			Source: { main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
	});

	it('skips unsafe target-node names before destination mapping', () => {
		const connections = jsonParse<WorkflowJSON['connections']>(
			'{"Source":{"main":[[{"node":"__proto__","type":"main","index":0},{"node":"Target","type":"main","index":0}]]}}',
		);

		const result = toEngineConnections(connections);
		const connectionsByDestination = mapConnectionsByDestination(result);

		expect(result).toEqual({
			Source: { main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
		expect(Object.hasOwn(connectionsByDestination, '__proto__')).toBe(false);
		expect(Object.getPrototypeOf(connectionsByDestination)).toBe(Object.prototype);
		expect(connectionsByDestination).toEqual({
			Target: { main: [[{ node: 'Source', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
	});

	it('preserves null output slots', () => {
		const connections: WorkflowJSON['connections'] = {
			Source: {
				main: [null, [{ node: 'Target', type: 'main', index: 0 }]],
			},
		};

		expect(toEngineConnections(connections)).toEqual({
			Source: { main: [null, [{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]] },
		});
	});
});

describe('toGroupValidationNodes', () => {
	it('defaults a missing node name to an empty string', () => {
		expect(
			toGroupValidationNodes([
				{
					id: 'node-id',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
				},
			]),
		).toEqual([
			{
				id: 'node-id',
				name: '',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		]);
	});
});

describe('dropInvalidWorkflowJsonGroups', () => {
	const getNodeType = makeGetNodeTypeForGrouping(makeNodeTypesProvider());

	it('returns no violations and leaves the workflow untouched when nodeGroups is missing', () => {
		const json = makeWorkflow([makeNode('a', 'A')]);
		const before = structuredClone(json);

		expect(dropInvalidWorkflowJsonGroups(json, getNodeType)).toEqual([]);
		expect(json).toEqual(before);
	});

	it('returns no violations and keeps valid groups untouched', () => {
		const nodeGroups = [{ id: 'g1', name: 'Valid group', nodeIds: ['a', 'b'] }];
		const json = makeWorkflow(
			[makeNode('a', 'A'), makeNode('b', 'B')],
			{
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			nodeGroups,
		);

		expect(dropInvalidWorkflowJsonGroups(json, getNodeType)).toEqual([]);
		expect(json.nodeGroups).toBe(nodeGroups);
		expect(json.nodeGroups).toEqual([{ id: 'g1', name: 'Valid group', nodeIds: ['a', 'b'] }]);
	});

	it('drops a group containing a trigger node', () => {
		const json = makeWorkflow(
			[makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger')],
			{},
			[{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] }],
		);

		const violations = dropInvalidWorkflowJsonGroups(json, getNodeType);

		expect(json.nodeGroups).toEqual([]);
		expect(violations).toEqual([
			expect.objectContaining({
				groupId: 'g1',
				groupName: 'Trigger group',
				code: 'trigger-selected',
			}),
		]);
		expect(violations[0]?.message).toContain('cannot contain trigger nodes: Manual Trigger.');
	});

	it('drops only invalid groups when valid and invalid groups are present', () => {
		const json = makeWorkflow(
			[
				makeNode('a', 'A'),
				makeNode('b', 'B'),
				makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger'),
			],
			{
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			[
				{ id: 'valid', name: 'Valid group', nodeIds: ['a', 'b'] },
				{ id: 'invalid', name: 'Trigger group', nodeIds: ['trigger'] },
			],
		);

		const violations = dropInvalidWorkflowJsonGroups(json, getNodeType);

		expect(json.nodeGroups).toEqual([{ id: 'valid', name: 'Valid group', nodeIds: ['a', 'b'] }]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.groupName).toBe('Trigger group');
	});

	it('returns every violation for dropped groups while dropping each group once', () => {
		const json = makeWorkflow([makeNode('a', 'A')], {}, [
			{ id: 'g1', name: 'Missing nodes group', nodeIds: ['missing-1', 'missing-2'] },
		]);

		const violations = dropInvalidWorkflowJsonGroups(json, getNodeType);

		expect(json.nodeGroups).toEqual([]);
		expect(violations).toHaveLength(2);
		expect(violations[0]?.message).toContain('missing-1');
		expect(violations[1]?.message).toContain('missing-2');
	});

	it('runs basic checks without getNodeType but skips trigger checks', () => {
		const basicInvalid = makeWorkflow([makeNode('a', 'A')], {}, [
			{ id: 'g1', name: 'Unknown node group', nodeIds: ['missing'] },
		]);
		const triggerGroup = makeWorkflow(
			[makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger')],
			{},
			[{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] }],
		);

		expect(dropInvalidWorkflowJsonGroups(basicInvalid, null)).toHaveLength(1);
		expect(basicInvalid.nodeGroups).toEqual([]);
		expect(dropInvalidWorkflowJsonGroups(triggerGroup, null)).toEqual([]);
		expect(triggerGroup.nodeGroups).toEqual([
			{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] },
		]);
	});

	it('detects a non-main boundary connection through the shared SDK adapter', () => {
		const json = makeWorkflow(
			[
				makeNode('agent', 'Agent', '@n8n/n8n-nodes-langchain.agent'),
				makeNode('model', 'Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi'),
			],
			{
				Model: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
			[{ id: 'g1', name: 'Agent group', nodeIds: ['agent'] }],
		);

		const violations = dropInvalidWorkflowJsonGroups(json, getNodeType);

		expect(json.nodeGroups).toEqual([]);
		expect(violations[0]?.message).toContain(
			'cannot cross the "ai_languageModel" connection between "Model" and "Agent"',
		);
	});
});
