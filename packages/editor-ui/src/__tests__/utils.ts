import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { defaultSettings } from './defaults';

export const retry = async (
	assertion: () => ReturnType<typeof expect>,
	{ interval = 20, timeout = 1000 } = {},
) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (err) {
					Date.now() - startTime > timeout ? reject(err) : tryAgain();
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
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
	onboardingCallPromptEnabled: false,
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveManualExecutions: false,
	binaryDataMode: 'default',
};
