import { setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialCard from '@/components/CredentialCard.vue';
import type { ICredentialsResponse } from '@/Interface';
import type { ProjectSharingData } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';

const renderComponent = createComponentRenderer(CredentialCard);

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: '',
	createdAt: '',
	updatedAt: '',
	type: '',
	name: '',
	sharedWithProjects: [],
	isManaged: false,
	homeProject: {} as ProjectSharingData,
	...overrides,
});

describe('CredentialCard', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		projectsStore = useProjectsStore();
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

	it('should show Change owner action only if there is resource permission and not on community plan', async () => {
		vi.spyOn(projectsStore, 'isTeamProjectFeatureEnabled', 'get').mockReturnValue(true);

		const data = createCredential({
			scopes: ['credential:move'],
		});
		const { getByTestId } = renderComponent({ props: { data } });
		const cardActions = getByTestId('credential-card-actions');

		expect(cardActions).toBeInTheDocument();

		const cardActionsOpener = within(cardActions).getByRole('button');
		expect(cardActionsOpener).toBeInTheDocument();

		const controllingId = cardActionsOpener.getAttribute('aria-controls');

		await userEvent.click(cardActions);
		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Change owner');
	});

	it('should set readOnly variant based on prop', () => {
		const data = createCredential({});
		const { getByRole } = renderComponent({ props: { data, readOnly: true } });
		const heading = getByRole('heading');
		expect(heading).toHaveTextContent('Read only');
	});
});
