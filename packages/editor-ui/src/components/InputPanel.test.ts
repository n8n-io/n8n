import { setActivePinia } from 'pinia';
import InputPanel from '@/components/InputPanel.vue';
import { mountComponent } from '@/__tests__/render';
import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import { IConnections, NodeConnectionType } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';

describe('InputPanel.vue', () => {
	it('should compute rootNodesParents correctly', () => {
		const nodes = [
			createTestNode({ name: 'Normal Node' }),
			createTestNode({ name: 'Agent' }),
			createTestNode({ name: 'Tool' }),
		];
		const connections: IConnections = {
			[nodes[0].name]: {
				[NodeConnectionType.Main]: [
					[{ node: nodes[1].name, type: NodeConnectionType.Main, index: 0 }],
				],
			},
			[nodes[2].name]: {
				[NodeConnectionType.AiMemory]: [
					[{ node: nodes[1].name, type: NodeConnectionType.AiMemory, index: 0 }],
				],
			},
		};
		const workflowObject = createTestWorkflowObject({
			nodes,
			connections,
		});

		const pinia = createTestingPinia({
			initialState: {
				[STORES.NDV]: {
					// TODO: this does not work, ned to fix
					activeNode: { name: 'Agent' },
				},
				[STORES.WORKFLOWS]: {
					workflow: workflowObject,
				},
			},
		});

		setActivePinia(pinia);

		// Mount the component
		const wrapper = mountComponent(InputPanel, {
			pinia,
			props: {
				currentNodeName: 'Agent',
				runIndex: 0,
				workflow: workflowObject,
			},
		});

		// Assert the computed property returns the expected value
		// TODO: Update the expected value
		expect(wrapper.vm.rootNodesParents).toEqual(['Tool']);
	});
});
