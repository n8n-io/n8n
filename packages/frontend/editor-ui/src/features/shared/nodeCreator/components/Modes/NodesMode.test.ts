import { nextTick } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	ADD_EMPTY_GROUP_NODE_CREATOR_ITEM,
	AI_CATEGORY_MCP_NODES,
	AI_MCP_TOOL_NODE_TYPE,
	AI_OTHERS_NODE_CREATOR_VIEW,
	HTTP_REQUEST_NODE_TYPE,
	MESSAGE_AN_AGENT_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	REQUEST_NODE_FORM_URL,
	SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';
import type { CommandCreateElement, NodeCreateElement } from '@/Interface';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import { useKeyboardNavigation } from '@/features/shared/nodeCreator/composables/useKeyboardNavigation';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { createComponentRenderer } from '@/__tests__/render';
import { waitAllPromises } from '@n8n/frontend-test-utils';
import { mockRestrictedNodeTypes } from '@/__tests__/mocks';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import NodesMode from './NodesMode.vue';

const mockIsFeatureEnabled = vi.hoisted(() => vi.fn(() => true));

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
		isFeatureEnabled: mockIsFeatureEnabled,
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

function groupCommandElement(): CommandCreateElement {
	return {
		key: ADD_EMPTY_GROUP_NODE_CREATOR_ITEM,
		type: 'command',
		properties: {
			title: 'Group',
			description: 'Add an organisational container to your workflow',
			icon: 'group',
		},
	};
}

describe('NodesMode', () => {
	let pinia: Pinia;

	beforeEach(() => {
		vi.clearAllMocks();
		mockIsFeatureEnabled.mockReturnValue(true);
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		useKeyboardNavigation().detachKeydownEvent();
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

	describe('restricted node types', () => {
		function setNodeElement(): NodeCreateElement {
			return {
				key: 'n8n-nodes-base.set',
				type: 'node',
				subcategory: '*',
				properties: mockSimplifiedNodeType({
					name: 'n8n-nodes-base.set',
					displayName: 'Edit Fields',
					group: ['transform'],
				}),
			};
		}

		// Browsing hides a restricted type, so the row is only there to click while searching.
		function pushSearchStackWith(items: NodeCreateElement[]) {
			useViewStacks().pushViewStack({
				title: 'What happens next?',
				mode: 'nodes',
				rootView: REGULAR_NODE_CREATOR_VIEW,
				hasSearch: true,
				search: 'Edit Fields',
				items,
			});
		}

		async function pressEnterOnFirstItem() {
			const keyboardNavigation = useKeyboardNavigation();
			keyboardNavigation.attachKeydownEvent();
			await keyboardNavigation.setActiveItemIndex(0);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			// Keyboard navigation refreshes its selectable items on a zero-delay timer.
			await waitAllPromises();
			await nextTick();
		}

		it('does not add a restricted node on click', async () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.set': 'instance' });
			pushSearchStackWith([setNodeElement()]);

			const { emitted } = render({ pinia });
			await nextTick();

			await userEvent.click(screen.getByText('Edit Fields'));

			expect(emitted('nodeTypeSelected')).toBeUndefined();
		});

		it('does not add a restricted node on Enter', async () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.set': 'instance' });
			pushSearchStackWith([setNodeElement()]);

			const { emitted } = render({ pinia });
			await nextTick();

			await pressEnterOnFirstItem();

			expect(emitted('nodeTypeSelected')).toBeUndefined();
		});

		it('drops a restricted node from the empty-search suggestions', async () => {
			mockRestrictedNodeTypes({ [HTTP_REQUEST_NODE_TYPE]: 'instance' });
			useViewStacks().pushViewStack({
				title: 'What triggers this workflow?',
				mode: 'nodes',
				rootView: TRIGGER_NODE_CREATOR_VIEW,
				search: 'missing node',
				items: [],
			});

			const { emitted } = render({ pinia });
			await nextTick();

			expect(screen.getByText('No results for "missing node"')).toBeInTheDocument();
			expect(screen.queryByText('HTTP Request')).not.toBeInTheDocument();

			await userEvent.click(screen.getByText('Webhook'));
			expect(emitted('nodeTypeSelected')).toEqual([[[{ type: 'n8n-nodes-base.webhook' }]]]);
		});

		it('still adds an available node on Enter', async () => {
			pushSearchStackWith([setNodeElement()]);

			const { emitted } = render({ pinia });
			await nextTick();

			await pressEnterOnFirstItem();

			expect(emitted('nodeTypeSelected')).toEqual([[[{ type: 'n8n-nodes-base.set' }]]]);
		});
	});

	it('emits an empty-group selection for the Group item', async () => {
		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [groupCommandElement()],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Group'));

		expect(emitted('emptyGroupSelected')).toEqual([[]]);
		expect(emitted('nodeTypeSelected')).toBeUndefined();
	});

	it.each(['Enter', 'ArrowRight'])('activates the Group command with %s', async (key) => {
		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [groupCommandElement()],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		const keyboardNavigation = useKeyboardNavigation();
		keyboardNavigation.attachKeydownEvent();
		await keyboardNavigation.setActiveItemIndex(0);
		document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
		await waitAllPromises();
		await nextTick();

		expect(emitted('emptyGroupSelected')).toEqual([[]]);
		expect(emitted('nodeTypeSelected')).toBeUndefined();
	});

	it.each([TRIGGER_NODE_CREATOR_VIEW, REGULAR_NODE_CREATOR_VIEW] as const)(
		'does not render or select the Group item when empty groups are disabled in the %s view',
		async (rootView) => {
			mockIsFeatureEnabled.mockReturnValue(false);
			useViewStacks().pushViewStack({
				title: 'What happens next?',
				mode: 'nodes',
				rootView,
				hasSearch: true,
				items: [groupCommandElement()],
			});

			const { emitted } = render({ pinia });
			await nextTick();

			expect(screen.queryByText('Group')).not.toBeInTheDocument();
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			expect(emitted('emptyGroupSelected')).toBeUndefined();
		},
	);

	it('does not render the Group item during node replacement', async () => {
		useNodeCreatorStore().openingContext = 'replacement';
		useViewStacks().pushViewStack({
			title: 'Replace node',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [groupCommandElement()],
		});

		render({ pinia });
		await nextTick();

		expect(screen.queryByText('Group')).not.toBeInTheDocument();
	});

	it.each(['group', 'organisational', 'container'])(
		'shows the Group item when searching for %s',
		async (search) => {
			const groupItem = groupCommandElement();

			useViewStacks().pushViewStack({
				title: 'What happens next?',
				mode: 'nodes',
				rootView: REGULAR_NODE_CREATOR_VIEW,
				hasSearch: true,
				search,
				items: [groupItem],
				searchItems: [
					{
						key: 'n8n-nodes-base.set',
						type: 'node',
						subcategory: '*',
						properties: mockSimplifiedNodeType({
							name: 'n8n-nodes-base.set',
							displayName: 'Edit Fields',
						}),
					},
					groupItem,
				],
			});

			render({ pinia });
			await nextTick();

			expect(screen.getByText('Group')).toBeInTheDocument();
		},
	);

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
