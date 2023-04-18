import Container from 'typedi';
import { License } from '../../License';

export function isVersionControlEnabled() {
	const license = Container.get(License);
	return license.isVersionControlEnabled();
}
