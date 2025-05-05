import type { BooleanLicenseFeature } from '@n8n/constants';

import type { FeatureReturnType } from './license-state';

export interface LicenseProvider {
	/** Returns whether a feature is included in the user's license plan. */
	isLicensed(feature: BooleanLicenseFeature): boolean;

	/** Returns the value of a feature in the user's license plan, typically a boolean or integer. */
	getValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T];
}
