import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	jsonParse,
	NodeConnectionTypes,
	type INodeTypeDescription,
	type INodeTypes,
} from 'n8n-workflow';

import type { InstanceAiContext } from '../../../types';
import { dropInvalidNodeGroups } from '../node-group-validation';
import { partitionWarnings } from '../workflow-validation-warnings';

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

function makeContext(nodeTypesProvider?: INodeTypes): InstanceAiContext {
	return { nodeTypesProvider } as InstanceAiContext;
}

const context = makeContext(makeNodeTypesProvider());

describe('dropInvalidNodeGroups', () => {
	it('returns no warnings and leaves the workflow untouched when nodeGroups is missing', () => {
		const json = makeWorkflow([makeNode('a', 'A')]);
		const before = structuredClone(json);

		expect(dropInvalidNodeGroups(json, context)).toEqual([]);
		expect(json).toEqual(before);
	});

	it('returns no warnings and keeps valid groups untouched', () => {
		const nodeGroups = [{ id: 'g1', name: 'Valid group', nodeIds: ['a', 'b'] }];
		const json = makeWorkflow(
			[makeNode('a', 'A'), makeNode('b', 'B')],
			{
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			nodeGroups,
		);

		expect(dropInvalidNodeGroups(json, context)).toEqual([]);
		expect(json.nodeGroups).toBe(nodeGroups);
		expect(json.nodeGroups).toEqual([{ id: 'g1', name: 'Valid group', nodeIds: ['a', 'b'] }]);
	});

	it('drops a group containing a trigger node', () => {
		const json = makeWorkflow(
			[makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger')],
			{},
			[{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] }],
		);

		const warnings = dropInvalidNodeGroups(json, context);

		expect(json.nodeGroups).toEqual([]);
		expect(warnings).toEqual([
			expect.objectContaining({
				code: 'NODE_GROUP_DROPPED',
				severity: 'informational',
			}),
		]);
		expect(warnings[0]?.message).toContain('cannot contain trigger nodes: Manual Trigger.');
	});

	it('drops a group spanning disconnected graph islands', () => {
		const json = makeWorkflow(
			[makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')],
			{
				A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			[{ id: 'g1', name: 'Disconnected group', nodeIds: ['a', 'c'] }],
		);

		const warnings = dropInvalidNodeGroups(json, context);

		expect(json.nodeGroups).toEqual([]);
		expect(warnings[0]?.message).toContain(
			'must form a single connected subgraph with a single entry and exit',
		);
	});

	it('drops a group that splits an AI Agent from its sub-node', () => {
		const json = makeWorkflow(
			[
				makeNode('agent', 'Agent', '@n8n/n8n-nodes-langchain.agent'),
				makeNode('model', 'Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi'),
			],
			{
				Agent: {
					[NodeConnectionTypes.AiLanguageModel]: [
						[{ node: 'Model', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
					],
				},
			},
			[{ id: 'g1', name: 'Agent group', nodeIds: ['agent'] }],
		);

		const warnings = dropInvalidNodeGroups(json, context);

		expect(json.nodeGroups).toEqual([]);
		expect(warnings[0]?.message).toContain(
			'cannot cross the "ai_languageModel" connection between "Agent" and "Model"',
		);
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

		const warnings = dropInvalidNodeGroups(json, context);

		expect(json.nodeGroups).toEqual([{ id: 'valid', name: 'Valid group', nodeIds: ['a', 'b'] }]);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]?.message).toContain('Trigger group');
	});

	it('runs basic checks without a nodeTypesProvider but skips trigger checks', () => {
		const basicInvalid = makeWorkflow([makeNode('a', 'A')], {}, [
			{ id: 'g1', name: 'Unknown node group', nodeIds: ['missing'] },
		]);
		const triggerGroup = makeWorkflow(
			[makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger')],
			{},
			[{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] }],
		);

		expect(dropInvalidNodeGroups(basicInvalid, makeContext())).toHaveLength(1);
		expect(basicInvalid.nodeGroups).toEqual([]);
		expect(dropInvalidNodeGroups(triggerGroup, makeContext())).toEqual([]);
		expect(triggerGroup.nodeGroups).toEqual([
			{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] },
		]);
	});

	it('returns informational warnings that partition as non-blocking', () => {
		const json = makeWorkflow(
			[makeNode('trigger', 'Manual Trigger', 'n8n-nodes-base.manualTrigger')],
			{},
			[{ id: 'g1', name: 'Trigger group', nodeIds: ['trigger'] }],
		);

		const warnings = dropInvalidNodeGroups(json, context);

		expect(warnings).toEqual([expect.objectContaining({ severity: 'informational' })]);
		expect(partitionWarnings(warnings)).toEqual({ blocking: [], informational: warnings });
	});

	it('detects a non-main boundary connection through the SDK connection bridge', () => {
		const json = makeWorkflow(
			[makeNode('a', 'A'), makeNode('b', 'B')],
			{
				A: {
					[NodeConnectionTypes.AiTool]: [
						[{ node: 'B', type: NodeConnectionTypes.AiTool, index: 0 }],
					],
				},
			},
			[{ id: 'g1', name: 'Tool boundary group', nodeIds: ['a'] }],
		);

		const warnings = dropInvalidNodeGroups(json, context);

		expect(json.nodeGroups).toEqual([]);
		expect(warnings[0]?.message).toContain(
			'cannot cross the "ai_tool" connection between "A" and "B"',
		);
	});

	it('skips unknown connection types instead of throwing', () => {
		const json = makeWorkflow(
			[makeNode('a', 'A'), makeNode('b', 'B')],
			{
				A: {
					unknown: [[{ node: 'B', type: 'unknown', index: 0 }]],
				},
			},
			[{ id: 'g1', name: 'Unknown connection group', nodeIds: ['a'] }],
		);

		expect(dropInvalidNodeGroups(json, context)).toEqual([]);
		expect(json.nodeGroups).toEqual([
			{ id: 'g1', name: 'Unknown connection group', nodeIds: ['a'] },
		]);
	});

	it('skips __proto__ connection keys without polluting plain objects', () => {
		const connections = jsonParse<WorkflowJSON['connections']>(
			'{"A":{"__proto__":[[{"node":"B","type":"ai_tool","index":0}]]},"__proto__":{"main":[[{"node":"B","type":"main","index":0}]]}}',
		);
		const json = makeWorkflow([makeNode('a', 'A'), makeNode('b', 'B')], connections, [
			{ id: 'g1', name: 'Unsafe key group', nodeIds: ['a'] },
		]);

		expect(dropInvalidNodeGroups(json, context)).toEqual([]);
		expect({}).not.toHaveProperty(NodeConnectionTypes.Main);
		expect(json.nodeGroups).toEqual([{ id: 'g1', name: 'Unsafe key group', nodeIds: ['a'] }]);
	});
});
