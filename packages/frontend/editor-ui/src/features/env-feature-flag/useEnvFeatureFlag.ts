export const useEnvFeatureFlag = () => {
	const check = (flag: Uppercase<string>): boolean => {
		const key: `VITE_FEAT_${Uppercase<string>}` = `VITE_FEAT_${flag}`;
		const value = (import.meta.env as Record<Uppercase<string>, string | boolean | undefined>)[key];
		console.log(`[useFeatureFlag] Checking feature flag: ${key} = ${value}`);
		if (value === undefined) {
			console.warn(`[useFeatureFlag] Missing env var: ${key}`);
		}
		return value === 'false' ? false : !!value;
	};

	return {
		check,
	};
};
