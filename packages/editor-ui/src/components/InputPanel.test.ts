import InputPanel from '@/components/InputPanel.vue';
import { mountComponent } from '@/__tests__/render';
import { createTestWorkflowObject, mockNode } from '@/__tests__/mocks';
import type { IConnections } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { useNDVStore } from '@/stores/ndv.store';
import { mockedStore } from '@/__tests__/utils';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, NO_OP_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mock } from 'vitest-mock-extended';
import { IWorkflowDb } from '@/Interface';

let mockNDVStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
let mockWorkflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

describe('InputPanel.vue', () => {
	beforeEach(() => {
		createTestingPinia();

		mockNDVStore = mockedStore(useNDVStore);
		mockWorkflowsStore = mockedStore(useWorkflowsStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should compute rootNodesParents correctly', () => {
		const nodes = [
			mockNode({ name: 'Normal Node', type: CHAT_TRIGGER_NODE_TYPE }),
			mockNode({ name: 'Agent', type: AGENT_NODE_TYPE }),
			mockNode({ name: 'Tool', type: NO_OP_NODE_TYPE }),
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

		mockNDVStore.activeNodeName = 'Agent';
		mockWorkflowsStore.workflow = mock<IWorkflowDb>({
			connections: connections,
			active: true,
			nodes: nodes,
		});

		// Mount the component
		const wrapper = mountComponent(InputPanel, {
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
