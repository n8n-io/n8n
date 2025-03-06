import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { License } from '@/license';

export const updateIntervalTime = () =>
	Container.get(GlobalConfig).externalSecrets.updateInterval * 1000;
export const preferGet = () => Container.get(GlobalConfig).externalSecrets.preferGet;

export function isExternalSecretsEnabled() {
	const license = Container.get(License);
	return license.isExternalSecretsEnabled();
}
