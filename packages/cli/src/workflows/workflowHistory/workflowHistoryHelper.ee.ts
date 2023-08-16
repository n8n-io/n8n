import { License } from '@/License';
import Container from 'typedi';

export function isWorkflowHistoryLicensed() {
	const license = Container.get(License);
	return license.isWorkflowHistoryLicensed();
}
