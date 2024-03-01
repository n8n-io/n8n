import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialCard from '@/components/CredentialCard.vue';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useCredentialsStore } from '@/stores/credentials.store';

const renderComponent = createComponentRenderer(CredentialCard);

describe('CredentialCard', () => {
	let uiStore: ReturnType<typeof useUIStore>;
	let usersStore: ReturnType<typeof useUsersStore>;
	let credentialsStore: ReturnType<typeof useCredentialsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		uiStore = useUIStore();
		usersStore = useUsersStore();
		credentialsStore = useCredentialsStore();
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
