import { nextTick, ref } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { getDebounceTime } from '@n8n/composables/useDebounce';
import { CHAT_TRIGGER_NODE_TYPE, DEBOUNCE_TIME, MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import { createComponentRenderer } from '@/__tests__/render';
import AgentsMode from './AgentsMode.vue';

const getNodeById = vi.fn();
const mockDocumentStoreState = {
	allNodes: [],
	workflowTriggerNodes: [],
	aiNodes: [],
	getExpressionHandler: () => null,
	getNodeById,
};
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStoreState,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	injectWorkflowDocumentStore: () => ({ value: mockDocumentStoreState }),
}));

const setAddedNodeActionParameters = vi.fn();
const shouldPrependChatTrigger = vi.fn(() => false);
vi.mock('../../composables/useActions', () => ({
	useActions: () => ({ setAddedNodeActionParameters, shouldPrependChatTrigger }),
}));

const locatorState = {
	agentsResources: ref<Array<{ name: string; value: string; personalisation: null }>>([]),
	isLoadingResources: ref(false),
	loadError: ref<unknown | null>(null),
	hasMoreAgentsToLoad: ref(false),
	searchFilter: ref(''),
	onSearchFilter: vi.fn(),
	loadMore: vi.fn(),
	setAgentsResources: vi.fn(),
};
vi.mock('@/features/ndv/parameters/composables/useAgentResourcesLocator', () => ({
	useAgentResourcesLocator: () => locatorState,
}));

vi.mock('@/features/agents/composables/useAgentScopeProjectId', () => ({
	useAgentScopeProjectId: () => ref('project-1'),
}));

vi.mock('@/features/agents/composables/useAgentProjectNameResolver', () => ({
	useAgentProjectNameResolver: () => ({ resolveProjectName: () => null }),
}));

const render = createComponentRenderer(AgentsMode);

function pushAgentsViewStack() {
	useViewStacks().pushViewStack({
		title: 'AI Agent V1',
		hasSearch: true,
		mode: 'agents',
		items: [],
	});
}

describe('AgentsMode', () => {
	let pinia: Pinia;

	beforeEach(() => {
		vi.clearAllMocks();
		shouldPrependChatTrigger.mockReturnValue(false);
		getNodeById.mockReturnValue(undefined);
		pinia = createPinia();
		setActivePinia(pinia);
		locatorState.agentsResources.value = [];
		locatorState.isLoadingResources.value = false;
		locatorState.loadError.value = null;
		locatorState.hasMoreAgentsToLoad.value = false;
		locatorState.searchFilter.value = '';
	});

	it('renders the create-new entry, divider and agent rows', async () => {
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
			{ name: 'Sales Researcher', value: 'agent-2', personalisation: null },
		];
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(screen.getByText('Create new agent')).toBeInTheDocument();
		expect(screen.getByText('Or message an existing agent')).toBeInTheDocument();
		expect(screen.getByText('Support Triage')).toBeInTheDocument();
		expect(screen.getByText('Sales Researcher')).toBeInTheDocument();
	});

	it('adds the node preset to an inline agent when create-new is clicked', async () => {
		pushAgentsViewStack();
		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Create new agent'));

		expect(emitted('nodeTypeSelected')).toEqual([[[{ type: MESSAGE_AN_AGENT_NODE_TYPE }]]]);
		expect(setAddedNodeActionParameters).toHaveBeenCalledWith(
			expect.objectContaining({
				key: MESSAGE_AN_AGENT_NODE_TYPE,
				value: { agentSource: 'inline' },
			}),
		);
	});

	it('adds the node preset to the picked agent when an existing agent is clicked', async () => {
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
		];
		pushAgentsViewStack();
		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Support Triage'));

		expect(emitted('nodeTypeSelected')).toEqual([[[{ type: MESSAGE_AN_AGENT_NODE_TYPE }]]]);
		expect(setAddedNodeActionParameters).toHaveBeenCalledWith(
			expect.objectContaining({
				key: MESSAGE_AN_AGENT_NODE_TYPE,
				value: {
					agentSource: 'referenced',
					agentId: {
						__rl: true,
						mode: 'list',
						value: 'agent-1',
						cachedResultName: 'Support Triage',
					},
				},
			}),
		);
	});

	it('defaults the message to the chat input when a chat trigger will be auto-added', async () => {
		shouldPrependChatTrigger.mockReturnValue(true);
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Create new agent'));

		expect(setAddedNodeActionParameters).toHaveBeenCalledWith(
			expect.objectContaining({
				value: { agentSource: 'inline', message: '={{ $json.chatInput }}' },
			}),
		);
	});

	it('defaults the message to the chat input when appending to an existing chat trigger', async () => {
		const { useUIStore } = await import('@/app/stores/ui.store');
		useUIStore().lastInteractedWithNodeId = 'chat-trigger-id';
		getNodeById.mockReturnValue({ id: 'chat-trigger-id', type: CHAT_TRIGGER_NODE_TYPE });
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
		];
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Support Triage'));

		expect(setAddedNodeActionParameters).toHaveBeenCalledWith(
			expect.objectContaining({
				value: expect.objectContaining({
					agentSource: 'referenced',
					message: '={{ $json.chatInput }}',
				}),
			}),
		);
	});

	it('does not preset the message when connecting to a non-chat-trigger node', async () => {
		const { useUIStore } = await import('@/app/stores/ui.store');
		useUIStore().lastInteractedWithNodeId = 'some-node-id';
		getNodeById.mockReturnValue({ id: 'some-node-id', type: 'n8n-nodes-base.set' });
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Create new agent'));

		expect(setAddedNodeActionParameters).toHaveBeenCalledWith(
			expect.objectContaining({ value: { agentSource: 'inline' } }),
		);
	});

	it('tracks which option was selected', async () => {
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
		];
		pushAgentsViewStack();
		const trackSpy = vi.spyOn(useNodeCreatorStore(), 'onAgentPanelOptionSelected');
		render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Create new agent'));
		expect(trackSpy).toHaveBeenCalledWith({ choice: 'create_new' });

		await userEvent.click(screen.getByText('Support Triage'));
		expect(trackSpy).toHaveBeenCalledWith({ choice: 'existing_agent' });
	});

	it('forwards the panel search to the remote agent catalog, debounced', async () => {
		vi.useFakeTimers();
		try {
			pushAgentsViewStack();
			render({ pinia });
			await nextTick();

			useViewStacks().updateCurrentViewStack({ search: 'tri' });
			await vi.advanceTimersByTimeAsync(getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH) + 1);

			expect(locatorState.onSearchFilter).toHaveBeenCalledWith('tri');
		} finally {
			vi.useRealTimers();
		}
	});

	it('keeps the previous results visible instead of a skeleton while a search refresh is in flight', async () => {
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
		];
		locatorState.isLoadingResources.value = true;
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(screen.getByText('Support Triage')).toBeInTheDocument();
		expect(document.querySelector('.el-skeleton')).not.toBeInTheDocument();
	});

	it('shows a skeleton while loading with no results to show yet', async () => {
		locatorState.isLoadingResources.value = true;
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(document.querySelector('.el-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('agents-panel-empty')).not.toBeInTheDocument();
	});

	it('shows the empty state when the project has no agents', async () => {
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(screen.getByTestId('agents-panel-empty')).toBeInTheDocument();
		expect(screen.getByText('No agents in this project yet')).toBeInTheDocument();
	});

	it('shows the no-matches state as soon as a search is typed, before the debounced query lands', async () => {
		pushAgentsViewStack();
		useViewStacks().updateCurrentViewStack({ search: 'nope' });
		render({ pinia });
		await nextTick();

		expect(screen.getByText('No agents matching your search')).toBeInTheDocument();
	});

	it('shows the error state with a retry that reloads the catalog', async () => {
		locatorState.loadError.value = new Error('boom');
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(screen.getByTestId('agents-panel-load-error')).toBeInTheDocument();

		locatorState.setAgentsResources.mockClear();
		await userEvent.click(screen.getByText('Retry'));
		expect(locatorState.setAgentsResources).toHaveBeenCalled();
	});

	it('keeps the loaded list visible with an inline retry when load-more fails', async () => {
		locatorState.agentsResources.value = [
			{ name: 'Support Triage', value: 'agent-1', personalisation: null },
		];
		locatorState.loadError.value = new Error('boom');
		pushAgentsViewStack();
		render({ pinia });
		await nextTick();

		expect(screen.getByText('Support Triage')).toBeInTheDocument();
		expect(screen.queryByTestId('agents-panel-load-error')).not.toBeInTheDocument();
		expect(screen.getByTestId('agents-panel-load-more-error')).toBeInTheDocument();

		locatorState.setAgentsResources.mockClear();
		await userEvent.click(screen.getByText('Retry'));
		expect(locatorState.setAgentsResources).toHaveBeenCalled();
	});
});
