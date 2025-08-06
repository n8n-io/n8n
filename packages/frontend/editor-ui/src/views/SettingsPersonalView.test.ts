import userEvent from '@testing-library/user-event';
import { createPinia } from 'pinia';
import { waitAllPromises } from '@/__tests__/utils';
import SettingsPersonalView from '@/views/SettingsPersonalView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { ROLE } from '@n8n/api-types';
import { useUIStore } from '@/stores/ui.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSSOStore } from '@/stores/sso.store';
import { UserManagementAuthenticationMethod } from '@/Interface';

let pinia: ReturnType<typeof createPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let ssoStore: ReturnType<typeof useSSOStore>;
let usersStore: ReturnType<typeof useUsersStore>;
let uiStore: ReturnType<typeof useUIStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsPersonalView);

const currentUser = {
	id: '1',
	firstName: 'John',
	lastName: 'Doe',
	email: 'joh.doe@example.com',
	createdAt: Date().toString(),
	role: ROLE.Owner,
	isDefaultUser: false,
	isPendingUser: false,
	isPending: false,
	mfaEnabled: false,
};

describe('SettingsPersonalView', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();

		settingsStore = useSettingsStore(pinia);
		ssoStore = useSSOStore(pinia);
		usersStore = useUsersStore(pinia);
		uiStore = useUIStore(pinia);
		cloudPlanStore = useCloudPlanStore(pinia);

		usersStore.usersById[currentUser.id] = currentUser;
		usersStore.currentUserId = currentUser.id;

		await settingsStore.getSettings();
		ssoStore.initialize({
			authenticationMethod: UserManagementAuthenticationMethod.Email,
			config: settingsStore.settings.sso,
			features: {
				saml: true,
				ldap: true,
				oidc: true,
			},
		});
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should enable email and pw change', async () => {
		const { getByTestId, getAllByRole } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email')).toBeEnabled();
		expect(getByTestId('change-password-link')).toBeInTheDocument();
	});

	describe('when changing theme', () => {
		it('should disable save button when theme has not been changed', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('save-settings-button')).toBeDisabled();
		});

		it('should enable save button when theme is changed', async () => {
			const { getByTestId, getByPlaceholderText, findByText } = renderComponent({ pinia });
			await waitAllPromises();

			getByPlaceholderText('Select').click();
			const darkThemeOption = await findByText('Dark theme');
			darkThemeOption.click();

			await waitAllPromises();
			expect(getByTestId('save-settings-button')).toBeEnabled();
		});

		it('should not update theme after changing the selected theme', async () => {
			const { getByPlaceholderText, findByText } = renderComponent({ pinia });
			await waitAllPromises();

			getByPlaceholderText('Select').click();
			const darkThemeOption = await findByText('Dark theme');
			darkThemeOption.click();

			await waitAllPromises();
			expect(uiStore.theme).toBe('system');
		});

		it('should commit the theme change after clicking save', async () => {
			vi.spyOn(usersStore, 'updateUser').mockReturnValue(
				Promise.resolve({ id: '123', isPending: false }),
			);
			const { getByPlaceholderText, findByText, getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			getByPlaceholderText('Select').click();
			const darkThemeOption = await findByText('Dark theme');
			darkThemeOption.click();

			await waitAllPromises();

			getByTestId('save-settings-button').click();

			await waitAllPromises();

			expect(uiStore.theme).toBe('dark');
		});
	});

	describe('when external auth is enabled, email and password change', () => {
		beforeEach(() => {
			vi.spyOn(ssoStore, 'isSamlLoginEnabled', 'get').mockReturnValue(true);
			vi.spyOn(ssoStore, 'isDefaultAuthenticationSaml', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
		});

		it('should not be disabled for the instance owner', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(true);

			const { queryByTestId, getAllByRole } = renderComponent({ pinia });
			await waitAllPromises();

			expect(
				getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email'),
			).toBeEnabled();
			expect(queryByTestId('change-password-link')).toBeInTheDocument();
			expect(queryByTestId('mfa-section')).toBeInTheDocument();
		});

		it('should be disabled for members', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);

			const { queryByTestId, getAllByRole } = renderComponent({ pinia });
			await waitAllPromises();

			expect(
				getAllByRole('textbox').find((el) => el.getAttribute('type') === 'email'),
			).toBeDisabled();
			expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
			expect(queryByTestId('mfa-section')).not.toBeInTheDocument();
		});
	});

	test.each([
		['Default', ROLE.Default, false, 'Default role for new users'],
		['Member', ROLE.Member, false, 'Create and manage own workflows and credentials'],
		[
			'Admin',
			ROLE.Admin,
			false,
			'Full access to manage workflows,tags, credentials, projects, users and more',
		],
		['Owner', ROLE.Owner, false, 'Manage everything'],
		['Owner', ROLE.Owner, true, 'Manage everything and access Cloud dashboard'],
	])('should show %s user role information', async (label, role, hasCloudPlan, tooltipText) => {
		vi.spyOn(cloudPlanStore, 'hasCloudPlan', 'get').mockReturnValue(hasCloudPlan);
		vi.spyOn(usersStore, 'globalRoleName', 'get').mockReturnValue(role);

		const { queryByTestId, getByText } = renderComponent({ pinia });
		await waitAllPromises();

		expect(queryByTestId('current-user-role')).toBeVisible();
		expect(queryByTestId('current-user-role')).toHaveTextContent(label);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await userEvent.hover(queryByTestId('current-user-role')!);

		expect(getByText(tooltipText)).toBeVisible();
	});
});
