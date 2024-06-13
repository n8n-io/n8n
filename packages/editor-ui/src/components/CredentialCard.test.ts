import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialCard from '@/components/CredentialCard.vue';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ICredentialsResponse } from '@/Interface';
import type { ProjectSharingData } from '@/types/projects.types';

const renderComponent = createComponentRenderer(CredentialCard);

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: '',
	createdAt: '',
	updatedAt: '',
	type: '',
	name: '',
	sharedWithProjects: [],
	homeProject: {} as ProjectSharingData,
	...overrides,
});

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
		const projectName = 'Test Project';
		const data = createCredential({
			homeProject: {
				name: projectName,
			},
		});
		const { getByRole, getByTestId } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent(projectName);
	});

	it('should render name and personal project name', () => {
		const projectName = 'John Doe <john@n8n.io>';
		const data = createCredential({
			homeProject: {
				name: projectName,
			},
		});
		const { getByRole, getByTestId } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent('John Doe');
	});
});
