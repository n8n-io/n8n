import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CredentialSharing from './CredentialSharing.ee.vue';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRolesStore } from '@n8n/stores/roles.store';
import type { ICredentialsResponse } from '../../credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import { getDropdownItems } from '@/__tests__/utils';
import { useI18n } from '@n8n/i18n';
import type * as I18nModule from '@n8n/i18n';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';

const { fetchDependenciesMock, getDependenciesMock } = vi.hoisted(() => ({
	fetchDependenciesMock: vi.fn(),
	getDependenciesMock: vi.fn(),
}));

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		fetchDependencies: fetchDependenciesMock,
		getDependencies: getDependenciesMock,
	}),
}));

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
		'credentialEdit.credentialSharing.role.user.canUse': 'Can use',
		'credentialEdit.credentialSharing.role.user.canUse.description':
			"Can use this credential. Can't edit it.",
		'credentialEdit.credentialSharing.usedIn': 'Used in "{workflowName}"',
		'credentialEdit.credentialSharing.usedIn.count': 'Used in {count} workflows',
		'credentialEdit.credentialSharing.onlyYou': 'Only you',
		'credentialEdit.credentialSharing.onlyOwner': 'Only {name}',
		'credentialEdit.credentialSharing.share': 'Share',
		'credentialEdit.credentialSharing.shareWith': 'Share with {project}',
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
const testProjects = Array.from({ length: 3 }, createProjectListItem);

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

		fetchDependenciesMock.mockReset().mockResolvedValue(undefined);
		getDependenciesMock.mockReset().mockReturnValue(undefined);

		// Mock i18n
		vi.mocked(useI18n).mockReturnValue({
			baseText: mockBaseText,
		} as unknown as ReturnType<typeof useI18n>);

		// Mock store methods
		vi.spyOn(usersStore, 'fetchUsers').mockResolvedValue();
		vi.spyOn(projectsStore, 'getAllProjects').mockResolvedValue();
		vi.spyOn(projectsStore, 'searchShareableProjects').mockResolvedValue({
			count: testProjects.length,
			data: testProjects,
		});
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
				dataRedaction: false,
				otelCustomSpanAttributes: false,
				workflowReviews: false,
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
				dataRedaction: false,
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

	describe('dynamic credentials', () => {
		it('should allow sharing a private credential', () => {
			const credential = createCredential();
			const { queryByText, getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Sharing is no longer blocked: the add-share input is available...
			expect(getByTestId('project-sharing-select')).toBeInTheDocument();
			// ...and no "not supported" notice is shown
			expect(queryByText(/not supported/i)).not.toBeInTheDocument();
		});
	});

	describe('IAM-1435: credential sharing role rename', () => {
		it('keeps the "User" label and shows no static role badge when N8N_ENV_FEAT_CRED_SHARING is disabled', () => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'false' };

			const credential = createCredential({ sharedWithProjects: [testProjects[0]] });
			const { queryByTestId, getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Non-owner (static) view: no badge at all, since the flag is off
			expect(queryByTestId('project-sharing-static-role')).not.toBeInTheDocument();
			expect(getByTestId('project-sharing-list-item')).toBeInTheDocument();
		});

		it('shows a "Can use" role badge, with a "can\'t edit" description, when the flag is enabled and the viewer cannot share', () => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'true' };

			const credential = createCredential({ sharedWithProjects: [testProjects[0]] });
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(getByTestId('project-sharing-static-role')).toHaveTextContent('Can use');
		});

		it('shows "Can use" as static text (no select) for the owner too, when the flag is enabled', () => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'true' };

			const credential = createCredential({ sharedWithProjects: [testProjects[0]] });
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(getByTestId('project-sharing-static-role')).toHaveTextContent('Can use');
			expect(queryByTestId('project-sharing-role-select')).not.toBeInTheDocument();
		});

		it('uses "User" as the role option label in the editable select when the flag is disabled', async () => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'false' };

			const credential = createCredential({ sharedWithProjects: [testProjects[0]] });
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			const roleSelect = getByTestId('project-sharing-role-select');
			const dropdownItems = await getDropdownItems(roleSelect);
			expect(dropdownItems[0]).toHaveTextContent('User');
		});
	});

	describe('IAM-1435: projects used in but not shared with', () => {
		const marketingProject = {
			id: 'marketing-project',
			name: 'Marketing',
			type: 'team' as const,
			icon: null,
			createdAt: '',
			updatedAt: '',
			role: 'project:editor' as const,
		};

		const ownerPersonalProject = {
			id: 'owner-personal-project',
			name: 'Mona Pfeffer <mona@example.com>',
			type: 'personal' as const,
			icon: null,
			createdAt: '',
			updatedAt: '',
			relations: [],
			scopes: [],
			rolesManaged: false,
		};

		beforeEach(() => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'true' };
			projectsStore.myProjects = [marketingProject];
			projectsStore.personalProject = ownerPersonalProject;
		});

		it('shows a project the credential is used in but not shared with, with "Only you" and a Share action', () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(fetchDependenciesMock).toHaveBeenCalledWith([credential.id], 'credential');

			const row = getByTestId('credential-used-in-project');
			expect(row).toHaveTextContent('Marketing');
			expect(row).toHaveTextContent('Used in "Email summary"');
			expect(row).toHaveTextContent('Only you');
			expect(getByTestId('credential-used-in-project-share')).toHaveTextContent(
				'Share with Marketing',
			);
		});

		it('falls back to a plain "Share" button when the project has no name', () => {
			projectsStore.myProjects = [{ ...marketingProject, name: null }];
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(getByTestId('credential-used-in-project-share')).toHaveTextContent(/^\s*Share\s*$/);
		});

		it('summarizes as "Used in N workflows" when the credential is used in more than one workflow in the same project', () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
					{
						id: 'wf-2',
						name: 'Lead routing',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
					{
						id: 'wf-3',
						name: 'Weekly digest',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId, queryByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			const row = getByTestId('credential-used-in-project');
			expect(row).toHaveTextContent('Used in 3 workflows');
			expect(queryByText(/Used in "Email summary"/)).not.toBeInTheDocument();
		});

		it('shares the project when the Share action is clicked', async () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId, emitted } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			await userEvent.click(getByTestId('credential-used-in-project-share'));

			expect(emitted()['update:modelValue']).toEqual([[[marketingProject]]]);
		});

		it('does not list a project that is already explicitly shared', () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [marketingProject],
			});
			const { queryByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(queryByTestId('credential-used-in-project')).not.toBeInTheDocument();
		});

		it('does not show used-in projects when the viewer cannot share', () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { queryByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: false },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(queryByTestId('credential-used-in-project')).not.toBeInTheDocument();
			expect(fetchDependenciesMock).not.toHaveBeenCalled();
		});

		it('does not fetch or show used-in projects when the flag is disabled', () => {
			settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_CRED_SHARING: 'false' };
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { queryByTestId } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			expect(fetchDependenciesMock).not.toHaveBeenCalled();
			expect(queryByTestId('credential-used-in-project')).not.toBeInTheDocument();
		});

		it('shows "Only {owner}" instead of "Only you" when the viewer has share permission but is not the credential\'s owner (e.g. an instance admin)', () => {
			// Viewer's own personal project differs from the credential's home
			// project, even though they can still share it (broad admin scope).
			projectsStore.personalProject = {
				id: 'instance-admin-personal-project',
				name: 'Priya Nair <priya@example.com>',
				type: 'personal',
				icon: null,
				createdAt: '',
				updatedAt: '',
				relations: [],
				scopes: [],
				rolesManaged: false,
			};
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId, queryByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			const row = getByTestId('credential-used-in-project');
			expect(row).toHaveTextContent('Only Mona');
			expect(row).not.toHaveTextContent('Only Mona Pfeffer');
			expect(queryByText('Only you')).not.toBeInTheDocument();
			expect(getByTestId('credential-used-in-project-share')).toBeInTheDocument();
		});
	});
});
