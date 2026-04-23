import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createRunExecutionData, type INodeTypeDescription, type IRunData } from 'n8n-workflow';

import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';

import NodeSettings from './NodeSettings.vue';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return { ...actual, injectWorkflowDocumentStore: vi.fn() };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {}, name: 'fake-route' }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const httpNode = createTestNode({
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4,
});

const httpNodeType = {
	displayName: 'HTTP Request',
	name: 'n8n-nodes-base.httpRequest',
	group: ['transform'],
	description: 'Make HTTP requests',
	version: 4,
	defaults: { name: 'HTTP Request' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [{ displayName: 'URL', name: 'url', type: 'string', default: '' }],
} as unknown as INodeTypeDescription;

const renderNodeSettings = (runData?: IRunData) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const workflow = createTestWorkflow({ nodes: [httpNode], connections: {} });
	const workflowsStore = useWorkflowsStore();
	const workflowState = useWorkflowState();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();

	workflowsStore.setWorkflow(workflow);
	nodeTypesStore.setNodeTypes([httpNodeType]);
	ndvStore.activeNodeName = httpNode.name;

	if (runData) {
		workflowState.setWorkflowExecutionData({
			id: 'exec-1',
			workflowData: {
				...workflow,
				active: false,
				activeVersionId: null,
				isArchived: false,
				createdAt: '',
				updatedAt: '',
				versionId: '',
			},
			finished: true,
			mode: 'manual',
			status: 'success',
			startedAt: new Date(),
			createdAt: new Date(),
			data: createRunExecutionData({ resultData: { runData } }),
		} as never);
	}

	vi.mocked(injectWorkflowDocumentStore).mockReturnValue(
		shallowRef(useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))),
	);

	return createComponentRenderer(NodeSettings, {
		global: {
			stubs: {
				NodeTitle: true,
				NodeExecuteButton: true,
				NodeCredentials: true,
				NodeWebhooks: true,
				NodeActionsList: true,
				NodeSettingsHeader: true,
				NodeSettingsInvalidNodeWarning: true,
				ExperimentalEmbeddedNdvHeader: true,
				NDVSubConnections: true,
				ParameterInputList: true,
				FreeAiCreditsCallout: true,
				NodeStorageLimitCallout: true,
				QuickConnectBanner: true,
				CommunityNodeFooter: true,
				CommunityNodeUpdateInfo: true,
			},
		},
	})({
		props: {
			dragging: false,
			pushRef: 'pushRef',
			readOnly: true,
			foreignCredentials: [],
			blockUI: false,
			executable: false,
		},
	});
};

describe('NodeSettings', () => {
	it('defaults to the Parameters tab when read-only and the active node has execution data', async () => {
		const runData: IRunData = {
			[httpNode.name]: [
				{
					startTime: 0,
					executionTime: 0,
					executionIndex: 0,
					source: [],
					data: {},
				},
			],
		};

		const { findByTestId } = renderNodeSettings(runData);

		const paramsTab = await findByTestId('tab-params');
		await waitFor(() => {
			expect(paramsTab.querySelector('.tab')?.className).toContain('activeTab');
		});
	});

	it('switches to the Settings tab when the user clicks it', async () => {
		const { findByTestId } = renderNodeSettings();

		const paramsTab = await findByTestId('tab-params');
		const settingsTab = await findByTestId('tab-settings');

		await waitFor(() => {
			expect(paramsTab.querySelector('.tab')?.className).toContain('activeTab');
		});

		const settingsTabClickable = settingsTab.querySelector<HTMLElement>('.tab');
		expect(settingsTabClickable).not.toBeNull();
		await fireEvent.click(settingsTabClickable!);

		await waitFor(() => {
			expect(settingsTab.querySelector('.tab')?.className).toContain('activeTab');
			expect(paramsTab.querySelector('.tab')?.className).not.toContain('activeTab');
		});
	});
});
