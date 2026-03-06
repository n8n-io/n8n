import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CredentialSharing from './CredentialSharing.ee.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRolesStore } from '@/app/stores/roles.store';
import type { ICredentialsResponse } from '../../credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import { getDropdownItems } from '@/__tests__/utils';
import { useI18n } from '@n8n/i18n';
import type * as I18nModule from '@n8n/i18n';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof I18nModule>();
	return {
		...actual,
		useI18n: vi.fn(),
	};
});

const mockBaseText = vi.fn((key: string, options?: { interpolate?: Record<string, string> }) => {
	const translations: Record<string, string> = {
		'projects.sharing.allUsers': 'All users and projects',
		'credentialEdit.credentialSharing.info.owner':
			'Only users with credential sharing permission can change who this credential is shared with',
		'credentialEdit.credentialSharing.info.sharee.team': 'Shared by team project',
		'credentialEdit.credentialSharing.info.sharee.personal': 'Shared by personal project',
		'credentialEdit.credentialSharing.info.personalSpaceRestricted':
			"You don't have permission to share personal credentials",
		'credentialEdit.credentialSharing.role.user': 'User',
		'auth.roles.owner': 'Owner',
		'contextual.credentials.sharing.unavailable.title': 'Upgrade to collaborate',
		'contextual.credentials.sharing.unavailable.description':
			'You can share credentials with others when you upgrade your plan.',
		'contextual.credentials.sharing.unavailable.button': 'View plans',
	};

	let text = translations[key] || key;

	// Handle interpolation
	if (options?.interpolate) {
		Object.entries(options.interpolate).forEach(([placeholder, value]) => {
			text = text.replace(`{${placeholder}}`, value);
		});
	}

	return text;
});

const renderComponent = createComponentRenderer(CredentialSharing);

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: '1',
	name: 'Test Credential',
	type: 'testType',
	isManaged: false,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	homeProject: {
		id: 'project-1',
		name: 'Test Project',
		type: 'team',
		icon: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	sharedWithProjects: [],
	...overrides,
});

describe('CredentialSharing.ee', () => {
	let usersStore: ReturnType<typeof useUsersStore>;
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let rolesStore: ReturnType<typeof useRolesStore>;
	let isEnterpriseFeatureEnabledSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		usersStore = useUsersStore();
		projectsStore = useProjectsStore();
		settingsStore = useSettingsStore();
		rolesStore = useRolesStore();

		// Mock i18n
		vi.mocked(useI18n).mockReturnValue({
			baseText: mockBaseText,
		} as unknown as ReturnType<typeof useI18n>);

		// Mock store methods
		vi.spyOn(usersStore, 'fetchUsers').mockResolvedValue();
		vi.spyOn(projectsStore, 'getAllProjects').mockResolvedValue();
		vi.spyOn(rolesStore, 'processedCredentialRoles', 'get').mockReturnValue([
			{
				slug: 'credential:user',
				displayName: 'User',
				description: null,
				systemRole: false,
				roleType: 'credential',
				scopes: [],
				licensed: true,
			},
		]);
		isEnterpriseFeatureEnabledSpy = vi
			.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get')
			.mockReturnValue({
				sharing: true,
				ldap: false,
				saml: false,
				oidc: false,
				mfaEnforcement: false,
				logStreaming: false,
				advancedExecutionFilters: false,
				variables: false,
				sourceControl: false,
				externalSecrets: false,
				auditLogs: false,
				debugInEditor: false,
				binaryDataS3: false,
				workerView: false,
				advancedPermissions: false,
				apiKeyScopes: false,
				workflowDiffs: false,
				namedVersions: false,
				provisioning: true,
				showNonProdBanner: false,
				projects: {
					team: {
						limit: -1,
					},
				},
				customRoles: false,
				personalSpacePolicy: false,
			});
	});

	it('should render ProjectSharing component when sharing is enabled', () => {
		const credential = createCredential();
		const { getByTestId } = renderComponent({
			props: {
				credentialId: credential.id,
				credentialData: {},
				credentialPermissions: { share: true },
				credential,
				modalBus: createEventBus(),
			},
		});

		expect(getByTestId('project-sharing-select')).toBeInTheDocument();
	});

	describe('canShareGlobally computed property', () => {
		it('should pass canShareGlobally as true when user has credential:shareGlobally scope', async () => {
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				id: '1',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				globalScopes: ['credential:shareGlobally'],
			});

			const credential = createCredential();
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// When canShareGlobally is true, "All users and projects" option should be available
			const projectSharingSelect = getByTestId('project-sharing-select');
			expect(projectSharingSelect).toBeInTheDocument();

			// Open dropdown and verify "All users and projects" option is present
			const dropdownItems = await getDropdownItems(projectSharingSelect);
			expect(dropdownItems[0]).toHaveTextContent('All users and projects');
		});

		it('should pass canShareGlobally as false when user does not have credential:shareGlobally scope', async () => {
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue({
				id: '1',
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				isDefaultUser: false,
				isPendingUser: false,
				mfaEnabled: false,
				globalScopes: [],
			});

			const credential = createCredential();
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// When canShareGlobally is false, "All users and projects" option should NOT be available
			const projectSharingSelect = getByTestId('project-sharing-select');
			expect(projectSharingSelect).toBeInTheDocument();

			// Open dropdown and verify "All users and projects" option is NOT present
			const dropdownItems = await getDropdownItems(projectSharingSelect);
			// Should have no items or first item should not be "All users and projects"
			const hasAllUsersOption = Array.from(dropdownItems).some((item) =>
				item.textContent?.includes('All users and projects'),
			);
			expect(hasAllUsersOption).toBe(false);
		});

		it('should pass canShareGlobally as false when user is undefined', async () => {
			vi.spyOn(usersStore, 'currentUser', 'get').mockReturnValue(null);

			const credential = createCredential();
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// When user is undefined, canShareGlobally should default to false
			const projectSharingSelect = getByTestId('project-sharing-select');
			expect(projectSharingSelect).toBeInTheDocument();

			// Open dropdown and verify "All users and projects" option is NOT present
			const dropdownItems = await getDropdownItems(projectSharingSelect);
			// Should have no items or no "All users and projects" option
			const hasAllUsersOption = Array.from(dropdownItems).some((item) =>
				item.textContent?.includes('All users and projects'),
			);
			expect(hasAllUsersOption).toBe(false);
		});
	});

	describe('projects filtering', () => {
		it('should show upgrade action box when sharing is not enabled', () => {
			isEnterpriseFeatureEnabledSpy.mockReturnValue({
				sharing: false,
				ldap: false,
				saml: false,
				oidc: false,
				mfaEnforcement: false,
				logStreaming: false,
				advancedExecutionFilters: false,
				variables: false,
				sourceControl: false,
				externalSecrets: false,
				auditLogs: false,
				debugInEditor: false,
				binaryDataS3: false,
				workerView: false,
				advancedPermissions: false,
				apiKeyScopes: false,
				workflowDiffs: false,
				provisioning: true,
				showNonProdBanner: false,
				projects: {
					team: {
						limit: -1,
					},
				},
				customRoles: false,
				personalSpacePolicy: false,
			});

			const credential = createCredential();
			const { getByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Should show upgrade message
			expect(getByText(/upgrade to collaborate/i)).toBeInTheDocument();
		});
	});

	describe('readonly state', () => {
		it('should hide select and show info tip when user lacks share permission', () => {
			const credential = createCredential();
			const { queryByTestId, getByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Select should not be visible when static prop is true
			expect(queryByTestId('project-sharing-select')).not.toBeInTheDocument();
			// Info tip should be shown - since credential is team project, shows "Shared by team project"
			expect(getByText(/shared by team project/i)).toBeInTheDocument();
		});
	});

	describe('personal space restriction message', () => {
		it('should show owner message and disabled tooltip when in personal space and lacking share permission', () => {
			// Set personal project
			projectsStore.personalProject = createTestProject({
				id: 'personal-project-id',
				type: ProjectTypes.Personal,
			});

			const credential = createCredential({
				homeProject: {
					id: 'personal-project-id',
					name: 'Personal Project',
					type: 'personal',
					icon: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			});

			const { getByText, getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Should show owner info tip instead of restriction message
			expect(getByText(/can change who this credential is shared with/)).toBeInTheDocument();
			// Should show disabled select with tooltip
			expect(getByTestId('project-sharing-select')).toBeInTheDocument();
		});

		it('should show sharee message when not in personal space and lacking share permission', () => {
			// Set current project as team project (not personal)
			projectsStore.currentProject = createTestProject({
				id: 'team-project-id',
				type: ProjectTypes.Team,
			});

			const credential = createCredential({
				homeProject: {
					id: 'team-project-id',
					name: 'Team Project',
					type: 'team',
					icon: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			});

			const { getByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Team project shows the team sharee message
			expect(getByText(/shared by team project/i)).toBeInTheDocument();
		});
	});
});
