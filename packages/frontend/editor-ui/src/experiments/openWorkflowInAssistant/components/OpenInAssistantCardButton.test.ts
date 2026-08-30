import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { WorkflowResource } from '@/Interface';
import { INSTANCE_AI_NEW_VIEW } from '@/features/ai/instanceAi/constants';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';
import OpenInAssistantCardButton from './OpenInAssistantCardButton.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: {}, query: {} }),
}));

const renderComponent = createComponentRenderer(OpenInAssistantCardButton, {
	pinia: createTestingPinia(),
});

const workflow: WorkflowResource = {
	resourceType: 'workflow',
	id: '1',
	name: 'My Workflow',
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	readOnly: false,
	scopes: ['workflow:update'],
	homeProject: {
		id: 'p1',
		name: 'Personal',
		type: 'personal',
		icon: null,
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
	},
};

describe('OpenInAssistantCardButton', () => {
	let store: ReturnType<typeof mockedStore<typeof useOpenWorkflowInAssistantStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		store = mockedStore(useOpenWorkflowInAssistantStore);
		store.showsOptedOutCardButton = true;
	});

	it('opens the assistant for opted-out treatment users', async () => {
		const { getByTestId } = renderComponent({ props: { workflow } });

		await userEvent.click(getByTestId('workflow-card-open-in-assistant'));

		expect(push).toHaveBeenCalledWith({
			name: INSTANCE_AI_NEW_VIEW,
			query: { workflowId: workflow.id, source: 'workflow_list_button' },
		});
	});

	it('renders nothing outside the opted-out state', () => {
		store.showsOptedOutCardButton = false;
		const { queryByTestId } = renderComponent({ props: { workflow } });

		expect(queryByTestId('workflow-card-open-in-assistant')).not.toBeInTheDocument();
	});
});
