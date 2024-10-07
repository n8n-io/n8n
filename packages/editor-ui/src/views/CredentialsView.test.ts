import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '@/stores/credentials.store';
import CredentialsView from '@/views/CredentialsView.vue';
import { useUIStore } from '@/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor, within, fireEvent } from '@testing-library/vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '@/constants';
import userEvent from '@testing-library/user-event';
import { STORES } from '@/constants';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project } from '@/types/projects.types';

const mockRoutePush = vi.fn();
const mockRouteReplace = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		// your mocked methods
		useRouter: () => {
			return {
				push: mockRoutePush,
				replace: mockRouteReplace,
			};
		},
	};
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: { enterprise: { variables: true, projects: { team: { limit: -1 } } } },
	},
};

const renderComponent = createComponentRenderer(CredentialsView);

afterEach(() => {
	vi.clearAllMocks();
});

describe('CredentialsView', () => {
	it('should render credentials', () => {
		createTestingPinia({ initialState });
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.allCredentials = [
			{
				id: '1',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
			},
		];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = false;
		const { getByTestId } = renderComponent();
		expect(getByTestId('resources-list-item')).toBeInTheDocument();
	});

	it('should disable cards based on permissions', () => {
		createTestingPinia({ initialState });
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.allCredentials = [
			{
				id: '1',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				scopes: ['credential:update'],
			},
			{
				id: '2',
				name: 'test2',
				type: 'test2',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
			},
		];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = false;
		const { getAllByTestId } = renderComponent();

		const items = getAllByTestId('resources-list-item');
		expect(items.length).toBe(2);

		expect(within(items[1]).getByText('Read only')).toBeInTheDocument();
	});

	describe('create credential', () => {
		it('should show modal based on route param', async () => {
			createTestingPinia({ initialState });
			const uiStore = mockedStore(useUIStore);
			renderComponent({ props: { credentialId: 'create' } });
			expect(uiStore.openModal).toHaveBeenCalledWith(CREDENTIAL_SELECT_MODAL_KEY);
		});

		it('should update credentialId route param to create', async () => {
			createTestingPinia({ initialState });
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isProjectHome = false;
			projectsStore.currentProject = { scopes: ['credential:create'] } as Project;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
				},
			];
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('resources-list-add'));
			await waitFor(() =>
				expect(mockRouteReplace).toHaveBeenCalledWith({ params: { credentialId: 'create' } }),
			);
		});
	});

	describe('open existing credential', () => {
		it('should show modal based on route param', async () => {
			createTestingPinia({ initialState });
			const uiStore = mockedStore(useUIStore);
			renderComponent({ props: { credentialId: 'credential-id' } });
			expect(uiStore.openExistingCredential).toHaveBeenCalledWith('credential-id');
		});

		it('should update credentialId route param to create', async () => {
			createTestingPinia({ initialState });
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isProjectHome = false;
			projectsStore.currentProject = { scopes: ['credential:read'] } as Project;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
				},
			];
			const { getByTestId } = renderComponent();

			/**
			 * userEvent DOES NOT work here
			 */
			await fireEvent.click(getByTestId('resources-list-item'));
			await waitFor(() =>
				expect(mockRouteReplace).toHaveBeenCalledWith({ params: { credentialId: '1' } }),
			);
		});
	});
});
