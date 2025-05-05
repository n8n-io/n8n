import type { BooleanLicenseFeature, NumericLicenseFeature } from '@n8n/constants';

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

export interface LicenseProvider {
	/** Returns whether a feature is included in the user's license plan. */
	isLicensed(feature: BooleanLicenseFeature): boolean;

	/** Returns the value of a feature in the user's license plan, typically a boolean or integer. */
	getValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T];
}
