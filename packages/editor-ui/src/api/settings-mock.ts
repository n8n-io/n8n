import { IRestApiContext, IN8nUISettings } from '../Interface';
import { makeRestApiRequest } from './helpers';

if (!window.localStorage.getItem('mock.settings.isUserManagementEnabled')) {
	window.localStorage.setItem('mock.settings.isUserManagementEnabled', 'true');
}

if (!window.localStorage.getItem('mock.settings.isInstanceSetup')) {
	window.localStorage.setItem('mock.settings.isInstanceSetup', 'false');
}

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	const settings = await makeRestApiRequest(context, 'GET', '/settings');
	const isUMEnabled = window.localStorage.getItem('mock.settings.isUserManagementEnabled');
	const isInstanceSetup = window.localStorage.getItem('mock.settings.isInstanceSetup');
	settings.userManagement = {
		enabled: isUMEnabled === 'true',
		hasOwner: isInstanceSetup === 'true',
	};
	return settings;
}
