import { IRestApiContext, IN8nUISettings } from '../Interface';
import { makeRestApiRequest } from './helpers';

if (!window.localStorage.getItem('mock.settings.isUserManagementEnabled')) {
	window.localStorage.setItem('mock.settings.isUserManagementEnabled', 'true');
}

if (!window.localStorage.getItem('mock.settings.showSetupOnFirstLoad')) {
	window.localStorage.setItem('mock.settings.showSetupOnFirstLoad', 'true');
}

export async function getSettings(context: IRestApiContext): Promise<IN8nUISettings> {
	const settings = await makeRestApiRequest(context, 'GET', '/settings');
	const isUMEnabled = window.localStorage.getItem('mock.settings.isUserManagementEnabled');
	const showSetupOnFirstLoad = window.localStorage.getItem('mock.settings.showSetupOnFirstLoad');
	settings.userManagement = {
		enabled: isUMEnabled === 'true',
		showSetupOnFirstLoad: showSetupOnFirstLoad === 'true',
	};
	return settings;
}
