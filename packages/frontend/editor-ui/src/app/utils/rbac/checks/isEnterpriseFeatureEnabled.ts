/**
 * Stub function that always returns true to enable all enterprise features.
 * This replaces the original license check since we've removed all license restrictions.
 */
export const isEnterpriseFeatureEnabled = (): boolean => {
	return true;
};
