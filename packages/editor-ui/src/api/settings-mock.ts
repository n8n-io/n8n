import { IRestApiContext, IN8nUISettings } from '../Interface';
import { makeRestApiRequest } from './helpers';

if (!window.localStorage.getItem('mock.settings.isUserManagementEnabled')) {
	window.localStorage.setItem('mock.settings.isUserManagementEnabled', 'true');
}

if (!window.localStorage.getItem('mock.settings.showSetupOnFirstLoad')) {
	window.localStorage.setItem('mock.settings.showSetupOnFirstLoad', 'true');
}

if (!window.localStorage.getItem('mock.settings.smtpSetup')) {
	window.localStorage.setItem('mock.settings.smtpSetup', 'false');
}

if (!window.localStorage.getItem('mock.settings.personalizationSurveyEnabled')) {
	window.localStorage.setItem('mock.settings.personalizationSurveyEnabled', 'true');
}

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	const settings = await makeRestApiRequest(context, 'GET', '/settings');
	const isUMEnabled = window.localStorage.getItem('mock.settings.isUserManagementEnabled');
	const showSetupOnFirstLoad = window.localStorage.getItem('mock.settings.showSetupOnFirstLoad');
	const smtpSetup = window.localStorage.getItem('mock.settings.smtpSetup');
	const personalizationSurveyEnabled = window.localStorage.getItem('mock.settings.personalizationSurveyEnabled');
	window.localStorage.setItem('mock.settings.showSetupOnFirstLoad', 'false');
	settings.userManagement = {
		enabled: isUMEnabled === 'true',
		showSetupOnFirstLoad: showSetupOnFirstLoad === 'true',
		smtpSetup: smtpSetup === 'true',
	};
	settings.personalizationSurveyEnabled = personalizationSurveyEnabled === 'true';
	settings.tagsEnabled = true;
	return settings;
}
