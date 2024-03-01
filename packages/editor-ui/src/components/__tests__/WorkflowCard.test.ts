import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowCard from '@/components/WorkflowCard.vue';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const renderComponent = createComponentRenderer(WorkflowCard);

describe('WorkflowCard', () => {
	let uiStore: ReturnType<typeof useUIStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		uiStore = useUIStore();
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
		workflowsStore = useWorkflowsStore();
	});

	it('should render name and home project name', () => {
		const props = {
			data: {
				id: '1',
				name: 'Test name',
				homeProject: {
					name: 'Test Project',
				},
				createdAt: new Date().toISOString(),
			},
		};
		const { getByRole } = renderComponent({ props });

		const heading = getByRole('heading');
		const span = heading.querySelector('span');

		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent(props.data.name);
		expect(heading).toContain(span);
		expect(span).toHaveTextContent(props.data.homeProject.name);
	});

	it('should render name only', () => {
		const props = {
			data: {
				id: '1',
				name: 'Test name',
				createdAt: new Date().toISOString(),
			},
		};
		const { getByRole } = renderComponent({ props });

		const heading = getByRole('heading');
		const span = heading.querySelector('span');

		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent(props.data.name);
		expect(span).toBeNull();
	});
});
