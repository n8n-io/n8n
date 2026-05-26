import { setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import CredentialCard from './CredentialCard.vue';
import type { CredentialsResource } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCredentialsStore } from '../credentials.store';
import type { FrontendSettings } from '@n8n/api-types';
import type { ICredentialsResponse } from '../credentials.types';

const mockAuthorize = vi.fn();
const mockIsOAuthCredentialType = vi.fn();

vi.mock('../composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: mockAuthorize,
		isOAuthCredentialType: mockIsOAuthCredentialType,
	}),
}));

const renderComponent = createComponentRenderer(CredentialCard);

const createCredential = (overrides = {}): CredentialsResource =>
	({
		id: '',
		createdAt: '',
		updatedAt: '',
		type: '',
		name: '',
		sharedWithProjects: [],
		homeProject: {} as ProjectSharingData,
		...overrides,
	}) as Partial<CredentialsResource> as CredentialsResource;

describe('CredentialCard', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		projectsStore = useProjectsStore();
		settingsStore = useSettingsStore();
		settingsStore.settings = {
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			activeModules: ['dynamic-credentials'],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
		mockAuthorize.mockReset();
		mockIsOAuthCredentialType.mockReset();
		mockIsOAuthCredentialType.mockReturnValue(true);
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

		await userEvent.click(cardActionsOpener);
		const actions = document.querySelector(`#${controllingId}`);
		if (!actions) {
			throw new Error('Actions menu not found');
		}
		expect(actions).toHaveTextContent('Move');
	});

	it('should set readOnly variant based on prop', () => {
		const data = createCredential({});
		const { getByRole } = renderComponent({ props: { data, readOnly: true } });
		const heading = getByRole('heading');
		expect(heading).toHaveTextContent('Read only');
	});

	describe('global credentials', () => {
		it('should display global badge when credential has isGlobal true', () => {
			const data = createCredential({
				isGlobal: true,
				homeProject: {
					name: 'Test Project',
				},
			});

			const { getByTestId } = renderComponent({ props: { data } });

			const globalBadge = getByTestId('credential-global-badge');
			expect(globalBadge).toBeInTheDocument();
			expect(globalBadge).toHaveTextContent('Global');
		});

		it('should not display global badge when credential has isGlobal false', () => {
			const data = createCredential({
				isGlobal: false,
				homeProject: {
					name: 'Test Project',
				},
			});

			const { queryByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-global-badge')).not.toBeInTheDocument();
		});

		it('should not display global badge when isGlobal is undefined', () => {
			const data = createCredential({
				homeProject: {
					name: 'Test Project',
				},
			});

			const { queryByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-global-badge')).not.toBeInTheDocument();
		});

		it('should display both project badge and global badge for global credentials', () => {
			const projectName = 'Test Project';
			const data = createCredential({
				isGlobal: true,
				homeProject: {
					name: projectName,
				},
			});

			const { getByTestId } = renderComponent({ props: { data } });

			// Project badge should be present
			const projectBadge = getByTestId('card-badge');
			expect(projectBadge).toBeInTheDocument();
			expect(projectBadge).toHaveTextContent(projectName);

			// Global badge should also be present
			const globalBadge = getByTestId('credential-global-badge');
			expect(globalBadge).toBeInTheDocument();
			expect(globalBadge).toHaveTextContent('Global');
		});
	});

	describe('resolvable credentials', () => {
		it('should display dynamic icon when credential has isResolvable true', () => {
			const data = createCredential({
				isResolvable: true,
				homeProject: {
					name: 'Test Project',
				},
			});

			const { getByTestId } = renderComponent({ props: { data } });

			expect(getByTestId('credential-card-dynamic')).toBeInTheDocument();
		});

		it('should not display dynamic icon when credential has isResolvable false', () => {
			const data = createCredential({
				isResolvable: false,
				homeProject: {
					name: 'Test Project',
				},
			});

			const { queryByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-card-dynamic')).not.toBeInTheDocument();
		});

		it('should not display dynamic icon when isResolvable is undefined', () => {
			const data = createCredential({
				homeProject: {
					name: 'Test Project',
				},
			});

			const { queryByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-card-dynamic')).not.toBeInTheDocument();
		});
	});

	describe('private credentials connect flow', () => {
		const privateUnconnectedData = (overrides = {}) =>
			createCredential({
				id: 'cred-1',
				isResolvable: true,
				connectedByMe: false,
				homeProject: { name: 'Test Project' },
				...overrides,
			});

		it('should show the Connect button when private and not connected', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { data: privateUnconnectedData() },
			});

			expect(getByTestId('credential-card-connect')).toBeInTheDocument();
			expect(queryByTestId('credential-card-not-connected')).not.toBeInTheDocument();
		});

		it('should still show project badge alongside the Connect button', () => {
			const { getByTestId } = renderComponent({
				props: { data: privateUnconnectedData() },
			});

			expect(getByTestId('card-badge')).toBeInTheDocument();
			expect(getByTestId('credential-card-connect')).toBeInTheDocument();
		});

		it('should show Connected label when private and connected', () => {
			const data = createCredential({
				isResolvable: true,
				connectedByMe: true,
				homeProject: { name: 'Test Project' },
			});

			const { getByTestId, queryByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-card-connect')).not.toBeInTheDocument();
			const connectedLabel = getByTestId('credential-card-connected');
			expect(connectedLabel).toBeInTheDocument();
			expect(connectedLabel).toHaveTextContent('Connected');
			expect(getByTestId('card-badge')).toBeInTheDocument();
		});

		it('should not show Connected label for non-resolvable credentials', () => {
			const data = createCredential({
				isResolvable: false,
				connectedByMe: true,
				homeProject: { name: 'Test Project' },
			});

			const { queryByTestId, getByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-card-connected')).not.toBeInTheDocument();
			expect(getByTestId('card-badge')).toBeInTheDocument();
		});

		it('should show sharing badge when credential is not resolvable', () => {
			const data = createCredential({
				isResolvable: false,
				connectedByMe: false,
				homeProject: { name: 'Test Project' },
			});

			const { queryByTestId, getByTestId } = renderComponent({ props: { data } });

			expect(queryByTestId('credential-card-connect')).not.toBeInTheDocument();
			expect(getByTestId('card-badge')).toBeInTheDocument();
		});

		it('should call authorize with the credential and emit "connected" on success', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'oAuth2Api' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(true);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(mockAuthorize).toHaveBeenCalledWith(credential);
			expect(emitted('connected')).toEqual([[data.id]]);
		});

		it('should fall back to opening the edit modal when the credential is not an OAuth type', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'notOAuthApi' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockIsOAuthCredentialType.mockReturnValue(false);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(mockIsOAuthCredentialType).toHaveBeenCalledWith('notOAuthApi');
			expect(mockAuthorize).not.toHaveBeenCalled();
			expect(emitted('click')).toEqual([[data.id]]);
			expect(emitted('connected')).toBeUndefined();
		});

		it('should not emit "connected" if authorize fails', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'oAuth2Api' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(false);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(mockAuthorize).toHaveBeenCalled();
			expect(emitted('connected')).toBeUndefined();
		});

		it('should not open the edit modal when Connect button is clicked', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'oAuth2Api' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(true);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(emitted('click')).toBeUndefined();
		});
	});
});
