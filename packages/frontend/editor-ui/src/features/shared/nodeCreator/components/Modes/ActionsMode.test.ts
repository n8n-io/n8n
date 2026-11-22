import { nextTick } from 'vue';
import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { REGULAR_NODE_CREATOR_VIEW } from '@/app/constants';
import type { ActionCreateElement } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';
import { useCustomActionWizard } from '@/features/shared/customNodes/useCustomActionWizard';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import { mockActionCreateElement } from '../../__tests__/utils';
import ActionsMode from './ActionsMode.vue';

const entryPoints = vi.hoisted(() => ({
	canCreate: vi.fn(() => true),
	addActionDataFor: vi.fn(),
}));
vi.mock('@n8n/frontend-module-custom-nodes', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useCustomNodeEntryPoints: () => entryPoints,
}));

const mockDocumentStoreState = {
	allNodes: [],
	workflowTriggerNodes: [],
	aiNodes: [],
	getExpressionHandler: () => null,
	onNodesChange: vi.fn(() => ({ off: vi.fn() })),
	setLastNodeParameters: vi.fn(),
	getNodeById: vi.fn(),
	setNodeParameters: vi.fn(),
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

const render = createComponentRenderer(ActionsMode);

const action = (nodeType: string, displayName: string, operation: string): ActionCreateElement => ({
	...mockActionCreateElement('Actions', {
		name: nodeType,
		displayName,
		actionKey: operation,
		values: { operation },
	}),
	key: nodeType,
});

const showActions = (title: string, items: ActionCreateElement[]) => {
	useViewStacks().pushViewStack({
		title,
		subcategory: title,
		mode: 'actions',
		rootView: REGULAR_NODE_CREATOR_VIEW,
		hasSearch: true,
		items,
		baselineItems: items,
	});
};

describe('ActionsMode', () => {
	let pinia: Pinia;

	const enable = ({ active = true, scopes = ['customNode:list', 'customNode:create'] } = {}) => {
		useSettingsStore().settings.activeModules = active ? ['custom-nodes'] : [];
		useRBACStore().setGlobalScopes(scopes as Scope[]);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		useCustomActionWizard().isOpen.value = false;
	});

	it('adds a custom action to a parent from the parent list', async () => {
		enable();
		entryPoints.addActionDataFor.mockImplementation((nodeType: string) =>
			nodeType === 'n8n-nodes-base.slack'
				? { mode: 'create', parentNodeType: 'n8n-nodes-base.slack' }
				: undefined,
		);
		showActions('Slack', [
			action('n8n-nodes-base.slackTrigger', 'On new message', 'message'),
			action('n8n-nodes-base.slack', 'Send message', 'post'),
		]);

		render({ pinia });
		await nextTick();

		const entry = screen.getByTestId('custom-action-add-entry');
		expect(entry).toHaveTextContent('Add custom action to Slack');

		await userEvent.click(entry);

		expect(useCustomActionWizard().isOpen.value).toBe(true);
		expect(useCustomActionWizard().data.value).toEqual({
			mode: 'create',
			parentNodeType: 'n8n-nodes-base.slack',
		});
		expect(useViewStacks().viewStacks).toHaveLength(0);
	});

	it('adds an action to a custom node', async () => {
		enable();
		entryPoints.addActionDataFor.mockReturnValue({ mode: 'create', customNodeId: 'node-1' });
		showActions('Acme', [
			action('n8n-custom.acme', 'Get weather', 'action-1@1'),
			action('n8n-custom.acme', 'Get forecast', 'action-2@1'),
		]);

		render({ pinia });
		await nextTick();

		const entry = screen.getByTestId('custom-action-add-entry');
		expect(entry).toHaveTextContent('Add action to Acme');

		await userEvent.click(entry);

		expect(useCustomActionWizard().data.value).toEqual({ mode: 'create', customNodeId: 'node-1' });
	});

	it('shows no entry for a node that is not in the parent list', async () => {
		enable();
		entryPoints.addActionDataFor.mockReturnValue(undefined);
		showActions('Edit Fields', [action('n8n-nodes-base.set', 'Set', 'set')]);

		render({ pinia });
		await nextTick();

		expect(screen.queryByTestId('custom-action-add-entry')).not.toBeInTheDocument();
	});

	it('asks for no entry data with the module off', async () => {
		enable({ active: false });
		showActions('Slack', [action('n8n-nodes-base.slack', 'Send message', 'post')]);

		render({ pinia });
		await nextTick();

		expect(screen.queryByTestId('custom-action-add-entry')).not.toBeInTheDocument();
		expect(entryPoints.addActionDataFor).not.toHaveBeenCalled();
	});
});
