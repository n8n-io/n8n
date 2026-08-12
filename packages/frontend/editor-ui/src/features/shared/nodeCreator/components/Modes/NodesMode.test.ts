import { nextTick } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	MESSAGE_AN_AGENT_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/app/constants';
import type { NodeCreateElement } from '@/Interface';
import { nodeViewEventBus } from '@/app/event-bus/node-view';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useNodeFavoritesStore } from '@/features/shared/nodeCreator/nodeFavorites.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import {
	getFavoriteNodesSectionItem,
	getStarterTemplateItems,
	getStarterTemplatesSectionItem,
} from '../../nodeCreator.utils';
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

describe('NodesMode', () => {
	let pinia: Pinia;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
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

	it('opens the favorites sub-panel listing favorited nodes', async () => {
		useNodeCreatorStore().setMergeNodes([
			mockSimplifiedNodeType({
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				group: ['output'],
			}),
			mockSimplifiedNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				group: ['transform'],
			}),
		]);
		useNodeFavoritesStore().toggleFavorite('n8n-nodes-base.slack');

		useViewStacks().pushViewStack({
			title: 'What happens next?',
			mode: 'nodes',
			rootView: REGULAR_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [getFavoriteNodesSectionItem()],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Your favourites'));

		expect(emitted('nodeTypeSelected')).toBeUndefined();

		const activeStack = useViewStacks().activeViewStack;
		expect(activeStack.title).toBe('Your favourites');
		expect(activeStack.items?.map((item) => item.key)).toEqual(['n8n-nodes-base.slack']);
	});

	it('opens the starter templates sub-panel when the section item is selected', async () => {
		useViewStacks().pushViewStack({
			title: 'What triggers this workflow?',
			mode: 'nodes',
			rootView: TRIGGER_NODE_CREATOR_VIEW,
			hasSearch: true,
			items: [getStarterTemplatesSectionItem()],
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Starter templates'));

		expect(emitted('nodeTypeSelected')).toBeUndefined();

		const activeStack = useViewStacks().activeViewStack;
		expect(activeStack.title).toBe('Starter templates');
		expect(activeStack.mode).toBe('nodes');
		expect(activeStack.items?.length).toBe(getStarterTemplateItems().length);
		expect(activeStack.items?.every((item) => item.type === 'openTemplate')).toBe(true);
	});

	it('imports a starter template onto the canvas and closes the creator', async () => {
		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');

		useViewStacks().pushViewStack({
			title: 'Starter templates',
			mode: 'nodes',
			rootView: TRIGGER_NODE_CREATOR_VIEW,
			hasSearch: false,
			items: getStarterTemplateItems(),
		});

		const { emitted } = render({ pinia });
		await nextTick();

		await userEvent.click(screen.getByText('Gmail'));

		// Pin the clicked tile to its template: the payload must contain the Gmail node
		expect(emitSpy).toHaveBeenCalledWith(
			'importWorkflowData',
			expect.objectContaining({
				trackEvents: false,
				data: expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({ type: 'n8n-nodes-base.gmail' }),
					]),
				}),
			}),
		);
		expect(emitted('nodeTypeSelected')).toBeUndefined();
		// Emptying the view stacks is what closes the node creator
		expect(useViewStacks().viewStacks).toHaveLength(0);
	});
});
