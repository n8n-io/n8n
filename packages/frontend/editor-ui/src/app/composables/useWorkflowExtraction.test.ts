import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type { IConnections, INode } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';

const { mockWorkflowsStore, mockWorkflowDocumentStore, mockNodeTypesStore, mockCanvasOperations } =
	vi.hoisted(() => ({
		mockWorkflowsStore: {
			workflowId: 'parent-workflow-id',
			createNewWorkflow: vi.fn(),
			publishWorkflow: vi.fn(),
		},
		mockWorkflowDocumentStore: {
			allNodes: [] as INodeUi[],
			connectionsBySourceNode: {} as IConnections,
			homeProject: { id: 'home-project' },
			parentFolder: null as { id: string } | null,
			getNodeById: vi.fn(),
			getNodeByName: vi.fn(),
			getChildNodes: vi.fn().mockReturnValue([]),
			getExpressionHandler: vi.fn().mockReturnValue({}),
		},
		mockNodeTypesStore: {
			getNodeType: vi.fn().mockReturnValue({
				inputs: ['main'],
				outputs: ['main'],
			}),
		},
		mockCanvasOperations: {
			addNodes: vi.fn().mockResolvedValue([{ id: 'execute-node-id' }]),
			replaceNodeConnections: vi.fn(),
			deleteNodes: vi.fn(),
			replaceNodeParameters: vi.fn(),
		},
	}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue(mockWorkflowsStore),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn().mockReturnValue({ value: mockWorkflowDocumentStore }),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn().mockReturnValue(mockNodeTypesStore),
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn().mockReturnValue(mockCanvasOperations),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		resetLastInteractedWith: vi.fn(),
		markStateDirty: vi.fn(),
		openModalWithData: vi.fn(),
	}),
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: vi.fn().mockReturnValue({
		startRecordingUndo: vi.fn(),
		stopRecordingUndo: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({
		baseText: vi.fn().mockImplementation((key: string) => key),
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: vi.fn().mockReturnValue({
		resolve: vi.fn().mockReturnValue({ href: '/workflow/new-id' }),
	}),
}));

import { useWorkflowExtraction } from '@/app/composables/useWorkflowExtraction';

function makeNode(name: string, position: [number, number] = [0, 0]): INodeUi {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position,
		parameters: {},
		disabled: false,
		issues: undefined,
		typeUnknown: false,
	} as INodeUi;
}

describe('useWorkflowExtraction', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		mockWorkflowsStore.createNewWorkflow.mockReset();
		mockWorkflowsStore.publishWorkflow.mockReset();
		mockCanvasOperations.addNodes.mockClear();
		mockCanvasOperations.replaceNodeConnections.mockClear();
		mockCanvasOperations.deleteNodes.mockClear();
		mockCanvasOperations.replaceNodeParameters.mockClear();
		mockWorkflowDocumentStore.getChildNodes.mockReturnValue([]);
		mockWorkflowDocumentStore.allNodes = [];
		mockWorkflowDocumentStore.connectionsBySourceNode = {};
	});

	describe('extractNodesIntoSubworkflow', () => {
		it('strips connections referencing nodes outside the extracted selection', async () => {
			const nodeA = makeNode('A', [0, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [400, 0]); // outside the extracted selection

			mockWorkflowDocumentStore.allNodes = [nodeA, nodeB, nodeC];
			mockWorkflowDocumentStore.connectionsBySourceNode = {
				A: {
					[NodeConnectionTypes.Main]: [
						[
							{ node: 'B', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'C', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			};

			mockWorkflowsStore.createNewWorkflow.mockResolvedValue({
				id: 'new-id',
				versionId: 'v1',
			});
			mockWorkflowsStore.publishWorkflow.mockResolvedValue(undefined);

			const { extractNodesIntoSubworkflow } = useWorkflowExtraction();

			await extractNodesIntoSubworkflow(
				{ start: 'A', end: undefined },
				[nodeA, nodeB],
				'Sub-workflow',
			);

			expect(mockWorkflowsStore.createNewWorkflow).toHaveBeenCalledTimes(1);
			const created = mockWorkflowsStore.createNewWorkflow.mock.calls[0][0] as WorkflowDataCreate;

			const aMainBuckets = created.connections?.A?.[NodeConnectionTypes.Main];
			expect(aMainBuckets).toBeDefined();
			const targetsFromA = (aMainBuckets?.[0] ?? []).map((c) => c?.node);
			expect(targetsFromA).toContain('B');
			expect(targetsFromA).not.toContain('C');

			const allTargets = Object.values(created.connections ?? {}).flatMap((byType) =>
				Object.values(byType).flatMap((buckets) =>
					(buckets ?? []).flatMap((bucket) => (bucket ?? []).map((c) => c?.node)),
				),
			);
			expect(allTargets).not.toContain('C');

			const createdNodeNames = (created.nodes ?? []).map((n: INode) => n.name);
			expect(createdNodeNames).not.toContain('C');
		});
	});
});
