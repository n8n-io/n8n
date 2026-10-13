import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import { groupSetupPanelRows } from '../setupPanelGroups';
import type { SetupPanelRow } from '../composables/useSetupPanelState';

const parameters = (nodeName: string): SetupPanelRow => ({
	item: {
		id: `wf:parameters:${nodeName}`,
		kind: 'parameters',
		nodeName,
		parameterNames: ['value'],
	},
	isDone: false,
});
const credential: SetupPanelRow = {
	item: {
		id: 'wf:credential:slackApi',
		kind: 'credential',
		credentialType: 'slackApi',
		nodeBindings: [{ nodeName: 'Send' }, { nodeName: 'Read' }],
	},
	isDone: false,
};
const nodes = [
	createTestNode({ name: 'Feed', type: 'n8n-nodes-base.rssFeedRead' }),
	createTestNode({ name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' }),
	createTestNode({ name: 'Service', type: 'service' }),
];
const options = {
	workflowId: 'wf',
	getNodeByName: (name: string) => nodes.find((node) => node.name === name),
	getNodeType: (node: (typeof nodes)[number]) =>
		mock<INodeTypeDescription>({
			codex: { categories: [node.type === 'service' ? 'Marketing' : 'Core Nodes'] },
		}),
};

describe('groupSetupPanelRows', () => {
	it('combines all bound service fields and leaves no empty Details group', () => {
		const send = parameters('Send');
		const read = parameters('Read');
		expect(groupSetupPanelRows([send, credential, read], options)).toEqual([
			{ id: credential.item.id, credential, parameters: [send, read] },
		]);
	});

	it('keeps RSS and standalone services named and collects unrelated fields in one Details group', () => {
		const groups = groupSetupPanelRows(
			['Feed', 'Schedule', 'Service', 'Unknown'].map(parameters),
			options,
		);
		expect(
			groups.map((group) => ({
				id: group.id,
				names: group.parameters.map((row) => row.item.nodeName),
				node: group.node?.name,
			})),
		).toEqual([
			{ id: 'wf:parameters:Feed', names: ['Feed'], node: 'Feed' },
			{ id: 'wf:parameters:Service', names: ['Service'], node: 'Service' },
			{ id: 'wf:details', names: ['Schedule', 'Unknown'], node: undefined },
		]);
	});
});
