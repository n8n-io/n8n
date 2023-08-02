import { License } from '@/License';
import Container from 'typedi';

export function isExternalSecretsEnabled() {
	const license = Container.get(License);
	return license.isExternalSecretsEnabled();
}
