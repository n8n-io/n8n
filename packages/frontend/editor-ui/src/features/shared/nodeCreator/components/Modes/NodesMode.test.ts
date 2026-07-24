import { nextTick } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { MESSAGE_AN_AGENT_NODE_TYPE, REGULAR_NODE_CREATOR_VIEW } from '@/app/constants';
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
			displayName: 'AI Agent V1',
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

		await userEvent.click(screen.getByText('AI Agent V1'));

		expect(emitted('nodeTypeSelected')).toBeUndefined();

		const activeStack = useViewStacks().activeViewStack;
		expect(activeStack.mode).toBe('agents');
		expect(activeStack.title).toBe('AI Agent V1');
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
});
