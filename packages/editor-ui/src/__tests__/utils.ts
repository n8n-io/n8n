import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { defaultSettings } from './defaults';

/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retry(
 *   () => expect(screen.getByText('Hello')).toBeInTheDocument()
 * );
 */
export const retry = async (assertion: () => void, { interval = 20, timeout = 1000 } = {}) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (error) {
					if (Date.now() - startTime > timeout) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	initialized: true,
	settings: defaultSettings,
	promptsData: {
		message: '',
		title: '',
		showContactPrompt: false,
		showValueSurvey: false,
	},
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: UserManagementAuthenticationMethod.Email,
		quota: defaultSettings.userManagement.quota,
	},
	templatesEndpointHealthy: false,
	api: {
		enabled: false,
		latestVersion: 0,
		path: '/',
		swaggerUi: {
			enabled: false,
		},
	},
	ldap: {
		loginLabel: '',
		loginEnabled: false,
	},
	saml: {
		loginLabel: '',
		loginEnabled: false,
	},
	mfa: {
		enabled: false,
	},
	onboardingCallPromptEnabled: false,
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveManualExecutions: false,
};

export const getDropdownItems = async (dropdownTriggerParent: HTMLElement) => {
	await userEvent.click(within(dropdownTriggerParent).getByRole('textbox'));
	const selectTrigger = dropdownTriggerParent.querySelector(
		'.select-trigger[aria-describedby]',
	) as HTMLElement;
	await waitFor(() => expect(selectTrigger).toBeInTheDocument());

	const selectDropdownId = selectTrigger.getAttribute('aria-describedby');
	const selectDropdown = document.getElementById(selectDropdownId as string) as HTMLElement;
	await waitFor(() => expect(selectDropdown).toBeInTheDocument());

	return selectDropdown.querySelectorAll('.el-select-dropdown__item');
};
