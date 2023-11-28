// Feature flags
export const enum FeatureFlag {
	templateCredentialsSetup = 'template-credentials-setup',
}

const hasLocaleStorageKey = (key: string): boolean => {
	try {
		// Local storage might not be available in all envs e.g. when user has
		// disabled it in their browser
		return !!localStorage.getItem(key);
	} catch (e) {
		return false;
	}
};

export const isFeatureFlagEnabled = (flag: FeatureFlag): boolean => hasLocaleStorageKey(flag);
