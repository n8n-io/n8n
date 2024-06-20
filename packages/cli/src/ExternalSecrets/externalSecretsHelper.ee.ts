import { License } from '@/License';
import config from '@/config';
import Container from 'typedi';

export const updateIntervalTime = () => config.getEnv('externalSecrets.updateInterval') * 1000;
export const preferGet = () => config.getEnv('externalSecrets.preferGet');

export function isExternalSecretsEnabled() {
	const license = Container.get(License);
	return license.isExternalSecretsEnabled();
}
