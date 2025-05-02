import { render, waitFor } from '@testing-library/vue';
import NDVSubConnections from '@/components/NDVSubConnections.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription, WorkflowParameters } from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';

const nodeType: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: '@n8n/n8n-nodes-langchain.openAi',
	version: [1],
	inputs: [
		{ type: NodeConnectionTypes.Main },
		{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' },
	],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'openAiApi',
			required: true,
		},
	],
	properties: [],
	defaults: { color: '', name: '' },
	group: [],
	description: '',
};

const node: INodeUi = {
	parameters: {
		resource: 'assistant',
		assistantId: {
			__rl: true,
			mode: 'list',
			value: '',
		},
		options: {},
	},
	id: 'f30c2cbc-c1b1-4014-87f7-22e6ae7afcc8',
	name: 'OpenAI',
	type: '@n8n/n8n-nodes-langchain.openAi',
	typeVersion: 1.6,
	position: [1300, 540],
};

const workflow: WorkflowParameters = {
	nodes: [node],
	connections: {},
	pinData: {},
	active: false,
	nodeTypes: {
		getByName: vi.fn(),
		getByNameAndVersion: vi.fn(),
		getKnownTypes: vi.fn(),
	},
};

const getNodeType = vi.fn();

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		getCurrentWorkflow: vi.fn(() => new Workflow(workflow)),
		getNodeByName: vi.fn(() => node),
	})),
}));

describe('NDVSubConnections', () => {
	beforeAll(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia());
		vi.restoreAllMocks();
	});

	it('should render container if possible connections', async () => {
		getNodeType.mockReturnValue(nodeType);
		const { getByTestId, html } = render(NDVSubConnections, {
			props: {
				rootNode: node,
			},
		});
		vi.advanceTimersByTime(1000); // Event debounce time

		await waitFor(() => {});
		expect(getByTestId('subnode-connection-group-ai_tool')).toBeVisible();
		expect(html()).toEqual(
			`<div class="container">
  <div class="connections" style="--possible-connections: 1;">
    <div data-test-id="subnode-connection-group-ai_tool">
      <div class="connectionType"><span class="connectionLabel">Tools</span>
        <div>
          <div class="connectedNodesWrapper" style="--nodes-length: 0;">
            <div class="plusButton">
              <n8n-tooltip placement="top" teleported="true" offset="10" show-after="300" disabled="false">
                <n8n-icon-button size="medium" icon="plus" type="tertiary" data-test-id="add-subnode-ai_tool"></n8n-icon-button>
              </n8n-tooltip>
            </div>
            <!--v-if-->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
		);
	});

	it('should not render container if no possible connections', async () => {
		getNodeType.mockReturnValue(null);
		const component = render(NDVSubConnections, {
			props: {
				rootNode: node,
			},
		});
		vi.advanceTimersByTime(1000); // Event debounce time

		await waitFor(() => {});
		expect(component.html()).toEqual('<!--v-if-->');
	});
});
