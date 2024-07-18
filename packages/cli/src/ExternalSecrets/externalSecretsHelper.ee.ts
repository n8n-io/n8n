import { License } from '@/License';
import { ExternalSecretsConfig } from '@n8n/config/src/configs/external-secrets';
import Container from 'typedi';

export const updateIntervalTime = () => Container.get(ExternalSecretsConfig).updateInterval * 1000;
export const preferGet = () => Container.get(ExternalSecretsConfig).preferGet;

export function isExternalSecretsEnabled() {
	const license = Container.get(License);
	return license.isExternalSecretsEnabled();
}
