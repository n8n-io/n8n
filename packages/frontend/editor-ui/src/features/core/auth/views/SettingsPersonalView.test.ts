import { createPinia } from 'pinia';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { waitAllPromises, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import SettingsPersonalView from './SettingsPersonalView.vue';
import { confirmPasswordEventBus, promptMfaCodeBus } from '../auth.eventBus';
import {
	CONFIRM_PASSWORD_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
	type ConfirmPasswordModalData,
	type PromptMfaCodeModalData,
} from '../auth.constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { AuthenticationMethod, ROLE } from '@n8n/api-types';
import { MFA_DOCS_URL } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(() => ({ close: vi.fn() })),
	showToast: vi.fn(() => ({ close: vi.fn() })),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => toast,
}));

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

function getEmailInput(container: Element) {
	return container.querySelector<HTMLInputElement>('input[name="email"]');
}

function getFirstNameInput(container: Element) {
	return container.querySelector<HTMLInputElement>('input[name="firstName"]');
}

function getLastNameInput(container: Element) {
	return container.querySelector<HTMLInputElement>('input[name="lastName"]');
}

async function editAndLeave(input: HTMLInputElement, value: string) {
	await fireEvent.update(input, value);
	await fireEvent.blur(input);
	await waitAllPromises();
}

function getPromptMfaCodeData(openModalSpy: { mock: { calls: unknown[][] } }) {
	const [{ data }] = openModalSpy.mock.calls.at(-1) as [{ data: PromptMfaCodeModalData }];
	return data;
}

function getConfirmPasswordData(openModalSpy: { mock: { calls: unknown[][] } }) {
	const [{ data }] = openModalSpy.mock.calls.at(-1) as [{ data: ConfirmPasswordModalData }];
	return data;
}

async function selectTheme(container: Element, label: string) {
	await userEvent.click(within(container as HTMLElement).getByTestId('theme-select'));
	await userEvent.click(await within(document.body).findByRole('option', { name: label }));
	await waitAllPromises();
}

/**
 * The trigger holds every theme label to reserve the widest one's width; only the selected
 * label is shown, the others are hidden from assistive technology.
 */
function expectShownTheme(combobox: HTMLElement, label: string) {
	for (const option of ['System default', 'Light theme', 'Dark theme']) {
		const element = within(combobox).getByText(option);
		if (option === label) {
			expect(element).not.toHaveAttribute('aria-hidden');
		} else {
			expect(element).toHaveAttribute('aria-hidden', 'true');
		}
	}
}

describe('SettingsPersonalView', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
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
		expect(queryByTestId('current-user-name')).not.toBeInTheDocument();
		expect(getByRole('heading', { level: 2, name: 'Basic information' })).toBeInTheDocument();
		expect(getByRole('heading', { level: 2, name: 'Security' })).toBeInTheDocument();
		expect(getByRole('heading', { level: 2, name: 'Personalization' })).toBeInTheDocument();
		expect(getByTestId('personal-data-form')).toBeInTheDocument();
		expect(getByTestId('current-user-avatar')).toBeInTheDocument();
		expect(getByTestId('personal-profile-picture-row')).toHaveTextContent('Profile picture');
		expect(getByTestId('personal-profile-picture-row').nextElementSibling).toBe(
			getByTestId('personal-firstName-row'),
		);
		expect(getByTestId('personal-role-row')).toHaveTextContent('Owner');
		expect(getByTestId('change-password-link')).toBeInTheDocument();
		expect(getByTestId('mfa-section')).toBeInTheDocument();
		expect(getByTestId('mfa-docs-link')).toHaveAttribute('href', MFA_DOCS_URL);
		expect(getByTestId('mfa-docs-link')).toHaveAttribute('target', '_blank');
		expectShownTheme(getByRole('combobox', { name: 'Theme' }), 'System default');
	});

	describe('when leaving a name field', () => {
		it('should save only that field through updateUserName', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockResolvedValue({ id: '1', isPending: false });
			const requestEmailChangeSpy = vi.spyOn(usersStore, 'requestEmailChange');

			const { queryByTestId, container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getFirstNameInput(container)!, 'Jane');

			expect(updateUserNameSpy).toHaveBeenCalledTimes(1);
			expect(updateUserNameSpy).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Doe' });
			expect(requestEmailChangeSpy).not.toHaveBeenCalled();
			expect(queryByTestId('settings-save-bar')).not.toBeInTheDocument();
		});

		it('should confirm with a toast that closes itself and replaces the previous one', async () => {
			vi.spyOn(usersStore, 'updateUserName').mockResolvedValue({ id: '1', isPending: false });

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getFirstNameInput(container)!, 'Jane');
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: 'Personal details updated',
				type: 'success',
				showClose: false,
			});
			const firstToast = toast.showMessage.mock.results[0].value as { close: () => void };

			await editAndLeave(getLastNameInput(container)!, 'Smith');
			expect(firstToast.close).toHaveBeenCalled();
			expect(toast.showMessage).toHaveBeenCalledTimes(2);
		});

		it('should not save when the value did not change', async () => {
			const updateUserNameSpy = vi.spyOn(usersStore, 'updateUserName');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await editAndLeave(firstNameInput, '  John ');

			expect(updateUserNameSpy).not.toHaveBeenCalled();
			expect(firstNameInput).toHaveValue('John');
		});

		it('should save when pressing Enter', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockResolvedValue({ id: '1', isPending: false });

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const lastNameInput = getLastNameInput(container)!;
			lastNameInput.focus();
			await fireEvent.update(lastNameInput, 'Smith');
			await fireEvent.keyDown(lastNameInput, { key: 'Enter' });
			await waitAllPromises();

			expect(lastNameInput).not.toHaveFocus();
			expect(updateUserNameSpy).toHaveBeenCalledWith({ firstName: 'John', lastName: 'Smith' });
		});

		it('should put the saved value back when pressing Escape', async () => {
			const updateUserNameSpy = vi.spyOn(usersStore, 'updateUserName');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await fireEvent.update(firstNameInput, 'Jane');
			await fireEvent.keyDown(firstNameInput, { key: 'Escape' });
			await fireEvent.blur(firstNameInput);
			await waitAllPromises();

			expect(firstNameInput).toHaveValue('John');
			expect(updateUserNameSpy).not.toHaveBeenCalled();
		});

		it('should keep the other name as saved while it is not valid', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockResolvedValue({ id: '1', isPending: false });

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getLastNameInput(container)!, '');
			await editAndLeave(getFirstNameInput(container)!, 'Jane');

			expect(updateUserNameSpy).toHaveBeenCalledTimes(1);
			expect(updateUserNameSpy).toHaveBeenCalledWith({ firstName: 'Jane', lastName: 'Doe' });
		});

		it('should keep the edit when the save fails, so it can be tried again', async () => {
			const updateUserNameSpy = vi
				.spyOn(usersStore, 'updateUserName')
				.mockRejectedValue(new Error('Invalid name'));

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await editAndLeave(firstNameInput, 'Jane');

			expect(updateUserNameSpy).toHaveBeenCalled();
			expect(firstNameInput).toHaveValue('Jane');
		});

		it('should not save an empty name and explain why after leaving the field', async () => {
			const updateUserNameSpy = vi.spyOn(usersStore, 'updateUserName');

			const { queryByRole, getByRole, container } = renderComponent({ pinia });
			await waitAllPromises();

			const firstNameInput = getFirstNameInput(container)!;
			await fireEvent.update(firstNameInput, '');
			await waitAllPromises();

			// Flagging while still typing would be noise; the message waits for blur.
			expect(queryByRole('alert')).not.toBeInTheDocument();

			await fireEvent.blur(firstNameInput);
			await waitAllPromises();

			expect(getByRole('alert')).toHaveTextContent('This field is required');
			expect(firstNameInput).toHaveAttribute('aria-invalid', 'true');
			expect(updateUserNameSpy).not.toHaveBeenCalled();
		});
	});

	describe('when leaving the email field', () => {
		it('should confirm the change with the password, then route it through requestEmailChange', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const requestEmailChangeSpy = vi
				.spyOn(usersStore, 'requestEmailChange')
				.mockResolvedValue({ status: 'confirmation-sent' });
			const updateUserSpy = vi.spyOn(usersStore, 'updateUser');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');
			expect(openModalSpy).toHaveBeenCalledWith({
				name: CONFIRM_PASSWORD_MODAL_KEY,
				data: { submit: expect.any(Function) },
			});

			// The password dialog sends the request with the password the user typed.
			await getConfirmPasswordData(openModalSpy).submit({ currentPassword: 'secret' });

			expect(requestEmailChangeSpy).toHaveBeenCalledWith({
				email: 'new@example.com',
				currentPassword: 'secret',
			});
			expect(updateUserSpy).not.toHaveBeenCalled();
		});

		it('should let the password dialog report a wrong password, so it can stay open', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const rejection = new Error('Unable to update profile.');
			vi.spyOn(usersStore, 'requestEmailChange').mockRejectedValue(rejection);

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');

			await expect(
				getConfirmPasswordData(openModalSpy).submit({ currentPassword: 'secret' }),
			).rejects.toBe(rejection);
			expect(toast.showError).not.toHaveBeenCalled();
			// The email stays as typed while the dialog is still open.
			expect(getEmailInput(container)).toHaveValue('new@example.com');
		});

		it('should ask for a 2FA code instead of the password when 2FA is on', async () => {
			usersStore.usersById[currentUser.id] = { ...currentUser, mfaEnabled: true };
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const requestEmailChangeSpy = vi
				.spyOn(usersStore, 'requestEmailChange')
				.mockResolvedValue({ status: 'confirmation-sent' });

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');
			expect(openModalSpy).toHaveBeenCalledWith({
				name: PROMPT_MFA_CODE_MODAL_KEY,
				data: { purpose: 'changeEmail', submit: expect.any(Function) },
			});

			await getPromptMfaCodeData(openModalSpy).submit({ mfaCode: '123456' });

			expect(requestEmailChangeSpy).toHaveBeenCalledWith({
				email: 'new@example.com',
				mfaCode: '123456',
			});
			expect(getEmailInput(container)).toHaveValue(currentUser.email);
		});

		it('should let the 2FA dialog report a rejected code, so it can stay open', async () => {
			usersStore.usersById[currentUser.id] = { ...currentUser, mfaEnabled: true };
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const rejection = new Error('Invalid two-factor code.');
			vi.spyOn(usersStore, 'requestEmailChange').mockRejectedValue(rejection);

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');

			await expect(getPromptMfaCodeData(openModalSpy).submit({ mfaCode: '123456' })).rejects.toBe(
				rejection,
			);
			expect(toast.showError).not.toHaveBeenCalled();
		});

		it('should keep the current email when the 2FA dialog is closed without confirming', async () => {
			usersStore.usersById[currentUser.id] = { ...currentUser, mfaEnabled: true };
			const requestEmailChangeSpy = vi.spyOn(usersStore, 'requestEmailChange');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');
			promptMfaCodeBus.emit('closed', undefined);
			await waitAllPromises();

			expect(requestEmailChangeSpy).not.toHaveBeenCalled();
			expect(getEmailInput(container)).toHaveValue(currentUser.email);
		});

		it('should show the current email again once the confirmation has been sent', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			vi.spyOn(usersStore, 'requestEmailChange').mockResolvedValue({
				status: 'confirmation-sent',
			});

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');
			await getConfirmPasswordData(openModalSpy).submit({ currentPassword: 'secret' });
			confirmPasswordEventBus.emit('closed', { currentPassword: 'secret' });
			await waitAllPromises();

			// The change only applies after the link is clicked.
			expect(getEmailInput(container)).toHaveValue(currentUser.email);
			expect(toast.showMessage).toHaveBeenCalledWith({
				title: 'Confirm your email change',
				message: 'Check your current inbox for a link to confirm the change.',
				type: 'success',
				showClose: false,
			});
		});

		it('should keep the current email when the dialog is closed without confirming', async () => {
			const requestEmailChangeSpy = vi.spyOn(usersStore, 'requestEmailChange');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'new@example.com');
			confirmPasswordEventBus.emit('closed', undefined);
			await waitAllPromises();

			expect(getEmailInput(container)).toHaveValue(currentUser.email);
			expect(requestEmailChangeSpy).not.toHaveBeenCalled();
		});

		it('should not open a second dialog while one is open', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { container } = renderComponent({ pinia });
			await waitAllPromises();

			const emailInput = getEmailInput(container)!;
			await editAndLeave(emailInput, 'new@example.com');
			await fireEvent.blur(emailInput);
			await waitAllPromises();

			expect(openModalSpy).toHaveBeenCalledTimes(1);
		});

		it('should not start the change for an invalid email', async () => {
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getByRole, container } = renderComponent({ pinia });
			await waitAllPromises();

			await editAndLeave(getEmailInput(container)!, 'not-an-email');

			expect(getByRole('alert')).toHaveTextContent('Enter a valid email address');
			expect(openModalSpy).not.toHaveBeenCalled();
		});
	});

	describe('when changing theme', () => {
		it('should apply the theme at once', async () => {
			const { getByRole, container } = renderComponent({ pinia });
			await waitAllPromises();

			await selectTheme(container, 'Dark theme');

			expect(uiStore.theme).toBe('dark');
			expectShownTheme(getByRole('combobox', { name: 'Theme' }), 'Dark theme');
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

	describe('when disabling 2FA', () => {
		it('should ask for a 2FA code or recovery code, then disable 2FA with it', async () => {
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
			usersStore.usersById[currentUser.id] = { ...currentUser, mfaEnabled: true };
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const disableMfaSpy = vi.spyOn(usersStore, 'disableMfa').mockResolvedValue();

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getByTestId('disable-mfa-button'));
			expect(openModalSpy).toHaveBeenCalledWith({
				name: PROMPT_MFA_CODE_MODAL_KEY,
				data: { purpose: 'disableMfa', submit: expect.any(Function) },
			});

			await getPromptMfaCodeData(openModalSpy).submit({
				mfaRecoveryCode: 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e',
			});

			expect(disableMfaSpy).toHaveBeenCalledWith({
				mfaRecoveryCode: 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e',
			});
			expect(toast.showToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Two-factor authentication disabled', type: 'success' }),
			);
		});

		it('should let the dialog report a failure instead of confirming', async () => {
			vi.spyOn(settingsStore, 'isMfaFeatureEnabled', 'get').mockReturnValue(true);
			usersStore.usersById[currentUser.id] = { ...currentUser, mfaEnabled: true };
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');
			const rejection = new Error('Invalid two-factor code.');
			vi.spyOn(usersStore, 'disableMfa').mockRejectedValue(rejection);

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			await userEvent.click(getByTestId('disable-mfa-button'));

			await expect(getPromptMfaCodeData(openModalSpy).submit({ mfaCode: '123456' })).rejects.toBe(
				rejection,
			);
			expect(toast.showToast).not.toHaveBeenCalled();
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
