import { createPinia } from 'pinia';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { waitAllPromises, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import SettingsPersonalView from './SettingsPersonalView.vue';
import { confirmPasswordEventBus } from '../auth.eventBus';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { AuthenticationMethod, ROLE } from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

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
	fullName: 'John Doe',
	email: 'joh.doe@example.com',
	createdAt: Date().toString(),
	role: ROLE.Owner,
	isDefaultUser: false,
	isPendingUser: false,
	isPending: false,
	mfaEnabled: false,
};

const SAVE_BAR = 'settings-save-bar';
const SAVE_BUTTON = 'settings-save-bar-save';
const DISCARD_BUTTON = 'settings-save-bar-discard';

function getEmailInput(container: Element) {
	return container.querySelector<HTMLInputElement>('input[name="email"]');
}

function getFirstNameInput(container: Element) {
	return container.querySelector<HTMLInputElement>('input[name="firstName"]');
}

async function selectTheme(container: Element, label: string) {
	const select = within(container as HTMLElement).getByTestId('theme-select');
	const trigger = select.querySelector('input') ?? select;
	await fireEvent.click(trigger);
	const option = await within(document.body).findByText(label);
	await fireEvent.click(option);
	await waitAllPromises();
}

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
			authenticationMethod: AuthenticationMethod.Email,
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
		const { getByTestId, container } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getEmailInput(container)).toBeEnabled();
		expect(getByTestId('change-password-link')).toBeInTheDocument();
	});

	it('should render the page with the shared settings layout', async () => {
		vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);

		const { getByTestId, getByRole, queryByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		expect(getByRole('heading', { level: 1, name: 'Personal settings' })).toBeInTheDocument();
		expect(getByTestId('current-user-name')).toHaveTextContent('John Doe');
		expect(getByRole('heading', { level: 2, name: 'Basic information' })).toBeInTheDocument();
		expect(getByRole('heading', { level: 2, name: 'Security' })).toBeInTheDocument();
		expect(getByRole('heading', { level: 2, name: 'Personalization' })).toBeInTheDocument();
		expect(getByTestId('personal-data-form')).toBeInTheDocument();
		expect(getByTestId('change-password-link')).toBeInTheDocument();
		expect(getByTestId('mfa-section')).toBeInTheDocument();
		expect(getByTestId('theme-select')).toBeInTheDocument();
		// Nothing has changed yet, so there is nothing to save.
		expect(queryByTestId(SAVE_BAR)).not.toBeInTheDocument();
	});

	describe('when saving basic info', () => {
		it('should save a name-only change through updateUserName', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockResolvedValue({ id: '1', isPending: false });
			const requestEmailChangeSpy = vi.spyOn(usersStore, 'requestEmailChange');

			const { getByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await fireEvent.update(getFirstNameInput(container)!, 'Jane');
			await waitAllPromises();

			getByTestId(SAVE_BUTTON).click();
			await waitAllPromises();

			expect(updateUserNameSpy).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Doe' });
			expect(requestEmailChangeSpy).not.toHaveBeenCalled();
		});

		it('should route an email change through requestEmailChange, not updateUser', async () => {
			const requestEmailChangeSpy = vi
				.spyOn(usersStore, 'requestEmailChange')
				.mockResolvedValue({ status: 'confirmation-sent' });
			const updateUserSpy = vi.spyOn(usersStore, 'updateUser');

			const { getByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await fireEvent.update(getEmailInput(container)!, 'new@example.com');
			await waitAllPromises();

			getByTestId(SAVE_BUTTON).click();
			await waitAllPromises();

			// The password modal collects the current password; simulate confirming it.
			confirmPasswordEventBus.emit('close', { currentPassword: 'secret' });
			await waitAllPromises();

			expect(requestEmailChangeSpy).toHaveBeenCalledWith({
				email: 'new@example.com',
				currentPassword: 'secret',
			});
			expect(updateUserSpy).not.toHaveBeenCalled();
		});

		it('should put the email back once the confirmation has been sent', async () => {
			vi.spyOn(usersStore, 'requestEmailChange').mockResolvedValue({
				status: 'confirmation-sent',
			});

			const { getByTestId, queryByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await fireEvent.update(getEmailInput(container)!, 'new@example.com');
			await waitAllPromises();
			getByTestId(SAVE_BUTTON).click();
			await waitAllPromises();
			confirmPasswordEventBus.emit('close', { currentPassword: 'secret' });
			await waitAllPromises();

			// The change only applies after the link is clicked, so nothing is left unsaved.
			expect(getEmailInput(container)).toHaveValue(currentUser.email);
			expect(queryByTestId(SAVE_BAR)).not.toBeInTheDocument();
		});

		it('should save when pressing Enter in a field', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockResolvedValue({ id: '1', isPending: false });

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await fireEvent.update(firstNameInput, 'Jane');
			await fireEvent.keyDown(firstNameInput, { key: 'Enter' });
			await waitAllPromises();

			expect(updateUserNameSpy).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Doe' });
		});

		it('should discard unsaved changes', async () => {
			const updateUserNameSpy = vi.spyOn(usersStore, 'updateUserName');

			const { getByTestId, queryByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await fireEvent.update(getFirstNameInput(container)!, 'Jane');
			await waitAllPromises();
			expect(getByTestId(SAVE_BAR)).toBeInTheDocument();

			getByTestId(DISCARD_BUTTON).click();
			await waitAllPromises();

			expect(getFirstNameInput(container)).toHaveValue('John');
			expect(queryByTestId(SAVE_BAR)).not.toBeInTheDocument();
			expect(updateUserNameSpy).not.toHaveBeenCalled();
		});
	});

	describe('when validating basic info', () => {
		it('should block saving an empty name and explain why after leaving the field', async () => {
			const { getByTestId, queryByRole, getByRole, container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await fireEvent.update(firstNameInput, '');
			await waitAllPromises();

			// Flagging while still typing would be noise; the message waits for blur.
			expect(getByTestId(SAVE_BUTTON)).toBeDisabled();
			expect(queryByRole('alert')).not.toBeInTheDocument();

			await fireEvent.blur(firstNameInput);
			await waitAllPromises();

			expect(getByRole('alert')).toHaveTextContent('This field is required');
			expect(firstNameInput).toHaveAttribute('aria-invalid', 'true');
		});

		it('should block saving an invalid email', async () => {
			const { getByTestId, getByRole, container } = renderComponent({ pinia });
			await waitAllPromises();

			const emailInput = getEmailInput(container)!;
			await fireEvent.update(emailInput, 'not-an-email');
			await fireEvent.blur(emailInput);
			await waitAllPromises();

			expect(getByTestId(SAVE_BUTTON)).toBeDisabled();
			expect(getByRole('alert')).toHaveTextContent('Enter a valid email address');
		});
	});

	describe('when changing theme', () => {
		it('should not show the save bar when theme has not been changed', async () => {
			const { queryByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(queryByTestId(SAVE_BAR)).not.toBeInTheDocument();
		});

		it('should show the save bar when theme is changed', async () => {
			const { getByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await selectTheme(container, 'Dark theme');

			expect(getByTestId(SAVE_BUTTON)).toBeEnabled();
		});

		it('should not update theme after changing the selected theme', async () => {
			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await selectTheme(container, 'Dark theme');

			expect(uiStore.theme).toBe('system');
		});

		it('should commit the theme change after clicking save', async () => {
			vi.spyOn(usersStore, 'updateUser').mockReturnValue(
				Promise.resolve({ id: '123', isPending: false }),
			);
			const { getByTestId, queryByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await selectTheme(container, 'Dark theme');

			getByTestId(SAVE_BUTTON).click();
			await waitAllPromises();

			expect(uiStore.theme).toBe('dark');
			expect(queryByTestId(SAVE_BAR)).not.toBeInTheDocument();
		});
	});

	describe('when the account is managed via environment variables', () => {
		beforeEach(() => {
			usersStore.usersById[currentUser.id] = { ...currentUser, isManagedByEnv: true };
		});

		it('should show the notice, lock the fields, and hide the security section', async () => {
			const { getByTestId, queryByTestId, queryByText, container } = renderComponent({
				pinia,
			});
			await waitAllPromises();

			expect(getByTestId('managed-by-env-notice')).toBeInTheDocument();
			expect(getFirstNameInput(container)).toBeNull();
			expect(getEmailInput(container)).toBeNull();
			expect(getByTestId('personal-firstName-value')).toHaveTextContent('John');
			expect(getByTestId('personal-email-value')).toHaveTextContent(currentUser.email);
			// The notice already explains the lock, so the rows don't repeat it.
			expect(queryByText('Managed by your identity provider.')).not.toBeInTheDocument();
			expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
			expect(queryByTestId('mfa-section')).not.toBeInTheDocument();
			// The theme is still the user's own to pick.
			expect(getByTestId('theme-select')).toBeInTheDocument();
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

			const { queryByTestId, getAllByText, container } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getEmailInput(container)).toBeEnabled();
			expect(queryByTestId('change-password-link')).toBeInTheDocument();
			expect(queryByTestId('mfa-section')).toBeInTheDocument();
			// The name still comes from the identity provider, and the rows say so.
			expect(getFirstNameInput(container)).toBeNull();
			expect(getAllByText('Managed by your identity provider.')).toHaveLength(2);
		});

		it('should be disabled for members', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);

			const { queryByTestId, getByTestId, getAllByText, container } = renderComponent({
				pinia,
			});
			await waitAllPromises();

			expect(getEmailInput(container)).toBeNull();
			expect(getByTestId('personal-email-value')).toHaveTextContent(currentUser.email);
			expect(getAllByText('Managed by your identity provider.')).toHaveLength(3);
			expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
			expect(queryByTestId('mfa-section')).not.toBeInTheDocument();
		});
	});

	describe('when signed in via LDAP', () => {
		beforeEach(() => {
			vi.spyOn(ssoStore, 'isEnterpriseLdapEnabled', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
			usersStore.usersById[currentUser.id] = { ...currentUser, signInType: 'ldap' };
		});

		it('should let a member configure MFA while hiding password change', async () => {
			vi.spyOn(usersStore, 'isInstanceOwner', 'get').mockReturnValue(false);

			const { queryByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			// LDAP has no native 2FA, so n8n's own MFA stays configurable...
			expect(queryByTestId('mfa-section')).toBeInTheDocument();
			// ...but password/email remain managed externally.
			expect(queryByTestId('change-password-link')).not.toBeInTheDocument();
			expect(getEmailInput(container)).toBeNull();
		});
	});

	describe('when 2FA is enforced', () => {
		it('should ask the user to set it up while it is still disabled', async () => {
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
			vi.spyOn(settingsStore, 'isMFAEnforced', 'get').mockReturnValue(true);

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('mfa-enforced-notice')).toBeInTheDocument();
			expect(getByTestId('enable-mfa-button')).toBeInTheDocument();
		});
	});

	test.each([
		['Default', ROLE.Default, false, 'Default role for new users'],
		['Member', ROLE.Member, false, 'Create and manage own workflows and credentials'],
		['Admin', ROLE.Admin, false, 'Full access to manage workflows'],
		['Owner', ROLE.Owner, false, 'Manage everything'],
		['Owner', ROLE.Owner, true, 'Manage everything and access Cloud dashboard'],
	])(
		'should show %s user role information with tooltip',
		async (label, role, hasCloudPlan, expectedTooltip) => {
			vi.spyOn(cloudPlanStore, 'hasCloudPlan', 'get').mockReturnValue(hasCloudPlan);
			vi.spyOn(usersStore, 'globalRoleName', 'get').mockReturnValue(role);

			const { queryByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const roleElement = queryByTestId('current-user-role');
			expect(roleElement).toBeVisible();
			expect(roleElement).toHaveTextContent(label);

			// Hover and verify tooltip content
			if (roleElement) {
				await hoverTooltipTrigger(roleElement);
				await waitFor(() => expect(getTooltip()).toHaveTextContent(expectedTooltip));
			}
		},
	);
});
