import { NodeConnectionTypes, type IConnections } from 'n8n-workflow';
import { buildWorkflowTourSteps } from './useWorkflowTour';
import type { WorkflowTourNode } from '../workflowTour.types';

function createNode(id: string, name: string): WorkflowTourNode {
	return {
		id,
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
	};
}

describe('buildWorkflowTourSteps', () => {
	it('orders described nodes breadth-first from triggers and appends unreachable described nodes', () => {
		const nodes = [
			createNode('trigger', 'Webhook'),
			createNode('normalize', 'Normalize Request'),
			createNode('classify', 'Classify Request'),
			createNode('model', 'Triage Model'),
			createNode('parser', 'Triage Schema'),
			createNode('switch', 'Route by Category'),
			createNode('incident', 'Notify Incident'),
			createNode('billing', 'Queue Billing'),
			createNode('merge', 'Merge Branches'),
			createNode('orphan', 'Archive Copy'),
		];
		const connections: IConnections = {
			Webhook: {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Normalize Request', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			'Normalize Request': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Classify Request', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			'Classify Request': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Route by Category', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			'Triage Model': {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'Classify Request', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
			'Triage Schema': {
				[NodeConnectionTypes.AiOutputParser]: [
					[{ node: 'Classify Request', type: NodeConnectionTypes.AiOutputParser, index: 0 }],
				],
			},
			'Route by Category': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Notify Incident', type: NodeConnectionTypes.Main, index: 0 }],
					[{ node: 'Queue Billing', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			'Notify Incident': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Merge Branches', type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			'Queue Billing': {
				[NodeConnectionTypes.Main]: [
					[{ node: 'Merge Branches', type: NodeConnectionTypes.Main, index: 1 }],
				],
			},
		};

		const steps = buildWorkflowTourSteps({
			nodes,
			connections,
			triggerNodeIds: ['trigger'],
			nodeDescriptions: Object.fromEntries(
				nodes.map((node) => [node.id, { summary: `${node.name} summary` }]),
			),
		});

		expect(steps.map((step) => step.nodeId)).toEqual([
			'trigger',
			'normalize',
			'classify',
			'model',
			'parser',
			'switch',
			'incident',
			'billing',
			'merge',
			'orphan',
		]);
	});

	it('skips present nodes without a node-id description and never matches by name', () => {
		const steps = buildWorkflowTourSteps({
			nodes: [createNode('node-id', 'Normalize Request')],
			connections: {},
			nodeDescriptions: {
				'Normalize Request': { summary: 'This key is a node name, not an id' },
			},
		});

		expect(steps).toEqual([]);
	});

	it('adds group metadata to steps for grouped nodes', () => {
		const steps = buildWorkflowTourSteps({
			nodes: [createNode('node-id', 'Normalize Request')],
			connections: {},
			nodeDescriptions: {
				'node-id': { summary: 'Normalizes request payloads' },
			},
			groups: [{ id: 'group-id', name: 'Customer Context' }],
			nodeIdToGroupId: new Map([['node-id', 'group-id']]),
		});

		expect(steps).toEqual([
			{
				nodeId: 'node-id',
				nodeName: 'Normalize Request',
				description: { summary: 'Normalizes request payloads' },
				groupId: 'group-id',
				groupName: 'Customer Context',
			},
		]);
	});
});
