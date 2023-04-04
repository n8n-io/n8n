import { License } from '@/License';
import Container from 'typedi';

export function isVariablesEnabled(): boolean {
	const license = Container.get(License);
	return license.isVariablesEnabled();
}

export function canCreateNewVariable(variableCount: number): boolean {
	if (!isVariablesEnabled()) {
		return false;
	}
	const license = Container.get(License);
	// This defaults to -1 which is what we want if we've enabled
	// variables via the config
	const limit = license.getVariablesLimit();
	if (limit === -1) {
		return true;
	}
	return limit > variableCount;
}

export function getVariablesLimit(): number {
	const license = Container.get(License);
	return license.getVariablesLimit();
}
