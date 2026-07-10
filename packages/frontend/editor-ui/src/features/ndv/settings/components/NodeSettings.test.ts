import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createRunExecutionData, type INodeTypeDescription, type IRunData } from 'n8n-workflow';

import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';

import NodeSettings from './NodeSettings.vue';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { NdvAgentConfigKey } from '@/features/ndv/agents/composables/useNdvAgentConfig';
import type { UseNdvAgentConfigReturn } from '@/features/ndv/agents/composables/useNdvAgentConfig';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return { ...actual, injectWorkflowDocumentStore: vi.fn() };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {}, name: 'fake-route' }),
	RouterLink: { template: '<a><slot /></a>' },
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	const { useWorkflowsStore } = await import('@/app/stores/workflows.store');
	return {
		useWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
		useRouteWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
	};
});

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

const agentNode = createTestNode({
	name: 'Message an Agent',
	type: MESSAGE_AN_AGENT_NODE_TYPE,
	typeVersion: 2,
});

const agentNodeType = {
	displayName: 'Message an Agent',
	name: MESSAGE_AN_AGENT_NODE_TYPE,
	group: ['transform'],
	description: 'Message an agent',
	version: 2,
	defaults: { name: 'Message an Agent' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{ displayName: 'Agent', name: 'agentId', type: 'agentSelector', default: '' },
		{ displayName: 'Message', name: 'text', type: 'string', default: '' },
		{
			displayName: 'Advanced',
			name: 'advanced',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [{ displayName: 'Session ID', name: 'sessionId', type: 'string', default: '' }],
		},
	],
} as unknown as INodeTypeDescription;

interface RenderOptions {
	runData?: IRunData;
	node?: typeof httpNode;
	nodeType?: INodeTypeDescription;
	provide?: Record<symbol, unknown>;
}

const renderNodeSettings = (options: RenderOptions = {}) => {
	const { runData, node = httpNode, nodeType = httpNodeType, provide = {} } = options;
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const workflow = createTestWorkflow({ nodes: [node], connections: {} });
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	workflowsStore.setWorkflowId(workflow.id);
	const ndvStore = useNDVStore(createWorkflowDocumentId(workflow.id));
	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));

	workflowDocumentStore.hydrate(workflow);
	nodeTypesStore.setNodeTypes([nodeType]);
	ndvStore.activeNodeName = node.name;

	if (runData) {
		useWorkflowExecutionStateStore(createWorkflowDocumentId(workflow.id)).setWorkflowExecutionData({
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
			provide,
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
				AgentNdvBuilderBanner: true,
				AgentNdvReferencedControls: true,
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

		const { findByTestId } = renderNodeSettings({ runData });

		const paramsTab = await findByTestId('tab-params');
		await waitFor(() => {
			expect(paramsTab.querySelector('.tab')?.className).toContain('activeTab');
		});
	});

	it('switches to the Settings tab when the user clicks it', async () => {
		const { findByTestId } = renderNodeSettings({});

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

	describe('AI Agent node surfaces', () => {
		// The children are stubbed, so NodeSettings only checks the orchestrator's presence.
		const provide = {
			[NdvAgentConfigKey as symbol]: {} as UseNdvAgentConfigReturn,
		};

		it('renders the banner and Agent section on the Parameters tab', async () => {
			const { container } = renderNodeSettings({
				node: agentNode,
				nodeType: agentNodeType,
				provide,
			});

			await waitFor(() => {
				expect(container.querySelector('agent-ndv-builder-banner-stub')).not.toBeNull();
				expect(container.querySelector('agent-ndv-referenced-controls-stub')).not.toBeNull();
			});
		});

		it('renders no agent surfaces when the orchestrator is not provided', async () => {
			const { container, findByTestId } = renderNodeSettings({
				node: agentNode,
				nodeType: agentNodeType,
			});

			await findByTestId('tab-params');
			expect(container.querySelector('agent-ndv-builder-banner-stub')).toBeNull();
			expect(container.querySelector('agent-ndv-referenced-controls-stub')).toBeNull();
		});

		it('renders no agent surfaces for a non-agent node', async () => {
			const { container, findByTestId } = renderNodeSettings({ provide });

			await findByTestId('tab-params');
			expect(container.querySelector('agent-ndv-builder-banner-stub')).toBeNull();
			expect(container.querySelector('agent-ndv-referenced-controls-stub')).toBeNull();
		});
	});
});
