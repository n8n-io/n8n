import { computed, shallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { NodeConnectionTypes, type IConnections } from 'n8n-workflow';

import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { SET_NODE_TYPE } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { getNDVStoreId } from '@/features/ndv/shared/ndv.store';

import OutputPanel from './OutputPanel.vue';

const INSTANCE_AI_MODULE_SETTINGS = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: false,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: false,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

const { generateSampleData } = vi.hoisted(() => ({ generateSampleData: vi.fn() }));

vi.mock('@/features/ai/instanceAi/instanceAi.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/ai/instanceAi/instanceAi.api')>()),
	generateSampleData,
}));

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/workflowDocument.store')>()),
	injectWorkflowDocumentStore: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ meta: {}, params: {} }),
	RouterLink: vi.fn(),
}));

const ACTIVE_NODE = createTestNode({ id: 'node-1', name: 'Set Node', type: SET_NODE_TYPE });
const TRIGGER_NODE = createTestNode({ id: 'node-0', name: 'Trigger' });

const connections: IConnections = {
	[TRIGGER_NODE.name]: {
		[NodeConnectionTypes.Main]: [
			[{ node: ACTIVE_NODE.name, type: NodeConnectionTypes.Main, index: 0 }],
		],
	},
};

const render = ({ instanceAiEnabled = false }: { instanceAiEnabled?: boolean } = {}) => {
	const workflow = createTestWorkflow({ nodes: [TRIGGER_NODE, ACTIVE_NODE], connections });
	const documentId = createWorkflowDocumentId(workflow.id);

	const pinia = createTestingPinia({
		stubActions: false,
		initialState: {
			[getNDVStoreId(documentId)]: { activeNodeName: ACTIVE_NODE.name },
		},
	});
	setActivePinia(pinia);

	mockedStore(useSettingsStore).moduleSettings = instanceAiEnabled
		? { 'instance-ai': { ...INSTANCE_AI_MODULE_SETTINGS } }
		: {};

	mockedStore(useNodeTypesStore).setNodeTypes(defaultNodeDescriptions);

	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	workflowDocumentStore.hydrate(workflow);
	vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));

	return createComponentRenderer(OutputPanel, {
		props: {
			runIndex: 0,
			pushRef: 'push-ref',
			displayMode: 'table',
		},
		global: {
			provide: {
				[WorkflowIdKey as unknown as string]: computed(() => workflow.id),
				[WorkflowDocumentStoreKey as symbol]: shallowRef(workflowDocumentStore),
			},
		},
	})();
};

describe('OutputPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('offers to generate sample data in the not-run empty state', async () => {
		const { findByTestId } = render({ instanceAiEnabled: true });

		expect(await findByTestId('ndv-generate-sample-data-link')).toBeInTheDocument();
	});

	it('hides the action when the instance-ai module is disabled', async () => {
		const { queryByTestId, findByText } = render({ instanceAiEnabled: false });

		// Wait for the empty state itself, so absence is not just "not rendered yet".
		await findByText('set mock data');
		expect(queryByTestId('ndv-generate-sample-data-link')).not.toBeInTheDocument();
	});

	// The empty state generates straight away — steering the scenario lives on the
	// editor wand, where the user is already reviewing the data.
	it('requests sample data for the active node on click', async () => {
		generateSampleData.mockResolvedValue({ pinData: { [ACTIVE_NODE.name]: [{ json: { a: 1 } }] } });

		const { findByTestId } = render({ instanceAiEnabled: true });

		await userEvent.click(await findByTestId('ndv-generate-sample-data-link'));

		await waitFor(() => expect(generateSampleData).toHaveBeenCalledTimes(1));
		expect(generateSampleData.mock.calls[0][1].nodeNames).toEqual([ACTIVE_NODE.name]);
		expect(generateSampleData.mock.calls[0][1].hint).toBeUndefined();
	});
});
