import { nextTick } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	AI_CATEGORY_MCP_NODES,
	AI_MCP_TOOL_NODE_TYPE,
	AI_OTHERS_NODE_CREATOR_VIEW,
	MESSAGE_AN_AGENT_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	REQUEST_NODE_FORM_URL,
	SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY,
} from '@/app/constants';
import type { NodeCreateElement } from '@/Interface';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import NodesMode from './NodesMode.vue';

const mockDocumentStoreState = {
	allNodes: [],
	workflowTriggerNodes: [],
	aiNodes: [],
	getExpressionHandler: () => null,
};
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStoreState,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	injectWorkflowDocumentStore: () => ({ value: mockDocumentStoreState }),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: () => ({ run: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isFeatureEnabled: () => false,
		getFeatureFlagPayload: (key: string) =>
			key === SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY
				? 'https://example.com/suggest-service'
				: undefined,
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({ query: {}, params: {} })),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

const render = createComponentRenderer(NodesMode);

function messageAnAgentElement(): NodeCreateElement {
	return {
		key: MESSAGE_AN_AGENT_NODE_TYPE,
		type: 'node',
		subcategory: '*',
		properties: mockSimplifiedNodeType({
			name: MESSAGE_AN_AGENT_NODE_TYPE,
			displayName: 'AI Agent V2',
			group: ['transform'],
		}),
	};
}

function mcpClientElement(): NodeCreateElement {
	return {
		key: AI_MCP_TOOL_NODE_TYPE,
		type: 'node',
		subcategory: AI_CATEGORY_MCP_NODES,
		properties: mockSimplifiedNodeType({
			name: AI_MCP_TOOL_NODE_TYPE,
			displayName: 'MCP Client Tool',
			group: ['transform'],
		}),
	};
}

describe('NodesMode', () => {
	let pinia: Pinia;

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('opens the agent picker sub-panel instead of adding the Message an Agent node', async () => {
		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [messageAnAgentElement()],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('AI Agent V2'));

		expect(emitted('nodeTypeSelected')).toBeUndefined();

		const activeStack = useViewStacks().activeViewStack;
		expect(activeStack.mode).toBe('agents');
		expect(activeStack.title).toBe('AI Agent V2');
		expect(activeStack.hasSearch).toBe(true);
		expect(activeStack.rootView).toBe(REGULAR_NODE_CREATOR_VIEW);
	});

	it('still adds other nodes directly', async () => {
		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [
				{
					key: 'n8n-nodes-base.set',
					type: 'node',
					subcategory: '*',
					properties: mockSimplifiedNodeType({
						name: 'n8n-nodes-base.set',
						displayName: 'Edit Fields',
						group: ['transform'],
					}),
				},
			],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Edit Fields'));

		expect(emitted('nodeTypeSelected')).toEqual([[[{ type: 'n8n-nodes-base.set' }]]]);
	});

	it('keeps the MCP client pinned once and shows the MCP empty state for no results', async () => {
		const mcpClient = mcpClientElement();
		const viewStacks = useViewStacks();
		viewStacks.pushViewStack({
			title: 'MCP Servers',
			mode: 'nodes',
			rootView: AI_OTHERS_NODE_CREATOR_VIEW,
			subcategory: AI_CATEGORY_MCP_NODES,
			search: 'MCP Client',
			items: [
				{
					key: AI_MCP_TOOL_NODE_TYPE,
					type: 'section',
					title: '',
					children: [mcpClient],
					showSeparator: true,
					hideHeader: true,
				},
			],
		});

		render({ pinia });
		await nextTick();

		expect(screen.getAllByText('MCP Client Tool')).toHaveLength(1);

		viewStacks.updateCurrentViewStack({ search: 'missing server' });
		await nextTick();

		expect(screen.getByText('MCP Client Tool')).toBeInTheDocument();
		expect(screen.getByText('No results for "missing server"')).toBeInTheDocument();
		expect(screen.getByText('Need another capability?')).toBeInTheDocument();
		expect(screen.getByText('Suggest a tool')).toBeInTheDocument();
		expect(screen.queryByText("We didn't make that... yet")).not.toBeInTheDocument();
	});

	it('shows the node suggestion footer for other empty searches', async () => {
		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			search: 'missing node',
			items: [],
		});

		render({ pinia });
		await nextTick();

		expect(screen.getByText('Need a native integration?')).toBeInTheDocument();
		expect(screen.getByText('Suggest a node').closest('a')).toHaveAttribute(
			'href',
			REQUEST_NODE_FORM_URL,
		);
	});
});
