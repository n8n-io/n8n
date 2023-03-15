import config from '@/config';
import { getLicense } from '@/License';

export function isVariablesEnabled(): boolean {
	const license = getLicense();
	return config.getEnv('enterprise.features.variables') || license.isVariablesEnabled();
}

export function canCreateNewVariable(variableCount: number): boolean {
	if (!isVariablesEnabled()) {
		return false;
	}
	const license = getLicense();
	// This defaults to -1 which is what we want if we've enabled
	// variables via the config
	const limit = license.getVariablesLimit();
	if (limit === -1) {
		return true;
	}
	return limit <= variableCount;
}

export function getVariablesLimit(): number {
	const license = getLicense();
	return license.getVariablesLimit();
}
