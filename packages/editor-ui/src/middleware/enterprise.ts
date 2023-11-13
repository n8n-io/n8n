import type { RouterMiddleware } from '@/types/router';
import { useSettingsStore } from '@/stores';
import type { EnterpriseEditionFeature } from '@/constants';
import { VIEWS } from '@/constants';

export type EnterpriseMiddlewareOptions = {
	features: EnterpriseEditionFeature[];
	mode?: 'oneOf' | 'allOf';
};

export const enterprise: RouterMiddleware<EnterpriseMiddlewareOptions> = async (
	to,
	from,
	next,
	options,
) => {
	const settingsStore = useSettingsStore();
	const mode = options.mode ?? 'allOf';

	let valid: boolean;
	if (mode === 'allOf') {
		valid = options.features.every((feature) => settingsStore.isEnterpriseFeatureEnabled(feature));
	} else {
		valid = options.features.some((feature) => settingsStore.isEnterpriseFeatureEnabled(feature));
	}

	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
