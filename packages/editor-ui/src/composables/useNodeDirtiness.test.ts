import { createTestNode } from '@/__tests__/mocks';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type FrontendSettings } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { type INodeConnections, NodeConnectionType } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import type router from 'vue-router';

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue({
		allNodes: [],
		runWorkflow: vi.fn(),
		subWorkflowExecutionError: null,
		getWorkflowRunData: null,
		setWorkflowExecutionData: vi.fn(),
		activeExecutionId: null,
		nodesIssuesExist: false,
		executionWaitingForWebhook: false,
		getCurrentWorkflow: vi.fn().mockReturnValue({ id: '123' }),
		getNodeByName: vi.fn(),
		getExecution: vi.fn(),
		nodeIssuesExit: vi.fn(),
		checkIfNodeHasChatParent: vi.fn(),
		getParametersLastUpdate: vi.fn(),
		getPinnedDataLastUpdate: vi.fn(),
		outgoingConnectionsByNodeName: vi.fn(),
	}),
}));

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@/composables/useI18n', () => ({
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockImplementation((key) => key) }),
}));

vi.mock('@/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		clearAllStickyNotifications: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
		saveCurrentWorkflow: vi.fn(),
		getWorkflowDataToSave: vi.fn(),
		setDocumentTitle: vi.fn(),
		executeData: vi.fn(),
		getNodeTypes: vi.fn().mockReturnValue([]),
	}),
}));

vi.mock('@/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn().mockReturnValue({
		updateNodesExecutionIssues: vi.fn(),
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRouter: vi.fn().mockReturnValue({
			push: vi.fn(),
		}),
		useRoute: vi.fn(),
	};
});

describe(useNodeDirtiness, () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeAll(() => {
		const pinia = createTestingPinia({ stubActions: false });

		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();
	});

	describe.only('dirtinessByName', () => {
		beforeEach(() => {
			// Enable new partial execution
			settingsStore.settings = {
				partialExecution: { version: 2, enforce: true },
			} as FrontendSettings;

			vi.mocked(workflowsStore).getWorkflowRunData = {
				node1: [
					{
						startTime: +new Date('2025-01-01'), // ran before parameter update
						executionTime: 0,
						executionStatus: 'success',
						source: [],
					},
				],
				node2: [
					{
						startTime: +new Date('2025-01-03'), // ran after parameter update
						executionTime: 0,
						executionStatus: 'success',
						source: [],
					},
				],
				node3: [], // never ran before
			};

			vi.mocked(workflowsStore).allNodes = [
				createTestNode({ name: 'node1' }),
				createTestNode({ name: 'node2' }),
				createTestNode({ name: 'node3' }),
			];

			vi.mocked(workflowsStore).getParametersLastUpdate.mockImplementation(
				(nodeName) =>
					({
						node1: +new Date('2025-01-02'),
						node2: +new Date('2025-01-02'),
						node3: +new Date('2025-01-02'),
					})[nodeName],
			);
			vi.mocked(workflowsStore).getPinnedDataLastUpdate.mockReturnValue(undefined);
		});

		it('should mark nodes with run data older than the last update time as dirty', () => {
			function calculateDirtiness(workflow: string) {
				vi.mocked(workflowsStore).outgoingConnectionsByNodeName.mockImplementation(() => ({}));
				const { dirtinessByName } = useNodeDirtiness();

				return dirtinessByName.value;
			}

			expect(
				calculateDirtiness(`
				A* -> B
				B -> C
				C
				`),
			).toMatchInlineSnapshot(`
				{
				  "node1": "parameters-updated",
				}
			`);
		});

		it('should mark nodes with a dirty node somewhere in its upstream as upstream-dirty', () => {
			vi.mocked(workflowsStore).outgoingConnectionsByNodeName.mockImplementation(
				(nodeName) =>
					({
						node1: { main: [[{ node: 'node2', type: NodeConnectionType.Main, index: 0 }]] },
						node2: { main: [[{ node: 'node3', type: NodeConnectionType.Main, index: 0 }]] },
					})[nodeName] ?? ({} as INodeConnections),
			);

			const { dirtinessByName } = useNodeDirtiness();

			expect(dirtinessByName.value).toMatchInlineSnapshot(`
				{
				  "node1": "parameters-updated",
				  "node2": "upstream-dirty",
				}
			`);
		});

		it('should return even if the connections forms a loop', () => {
			vi.mocked(workflowsStore).outgoingConnectionsByNodeName.mockImplementation(
				(nodeName) =>
					({
						node1: { main: [[{ node: 'node2', type: NodeConnectionType.Main, index: 0 }]] },
						node2: { main: [[{ node: 'node3', type: NodeConnectionType.Main, index: 0 }]] },
					})[nodeName] ?? ({} as INodeConnections),
			);

			const { dirtinessByName } = useNodeDirtiness();

			expect(dirtinessByName.value).toMatchInlineSnapshot(`
				{
				  "node1": "parameters-updated",
				  "node2": "upstream-dirty",
				}
			`);
		});
	});
});
