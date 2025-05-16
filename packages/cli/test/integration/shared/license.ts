import type { LicenseProvider, LicenseState } from '@n8n/backend-common';
import type { BooleanLicenseFeature, NumericLicenseFeature } from '@n8n/constants';

import type { License } from '@/license';

export interface LicenseMockDefaults {
	features?: BooleanLicenseFeature[];
	quotas?: Partial<{ [K in NumericLicenseFeature]: number }>;
}

export class LicenseMocker {
	private _enabledFeatures: Set<BooleanLicenseFeature> = new Set();

	private _defaultFeatures: Set<BooleanLicenseFeature> = new Set();

	private _featureQuotas: Map<NumericLicenseFeature, number> = new Map();

	private _defaultQuotas: Map<NumericLicenseFeature, number> = new Map();

	mock(license: License) {
		license.isLicensed = this.isFeatureEnabled.bind(this);
		license.getValue = this.getFeatureValue.bind(this);
	}

	mockLicenseState(licenseState: LicenseState) {
		const licenseProvider: LicenseProvider = {
			isLicensed: this.isFeatureEnabled.bind(this),
			getValue: this.getFeatureValue.bind(this),
		};

		licenseState.setLicenseProvider(licenseProvider);
	}

	reset() {
		this._enabledFeatures = new Set(this._defaultFeatures);
		this._featureQuotas = new Map(this._defaultQuotas);
	}

	setDefaults(defaults: LicenseMockDefaults) {
		this._defaultFeatures = new Set(defaults.features ?? []);
		this._defaultQuotas = new Map(
			Object.entries(defaults.quotas ?? {}) as Array<[NumericLicenseFeature, number]>,
		);
	}

	isFeatureEnabled(feature: BooleanLicenseFeature): boolean {
		return this._enabledFeatures.has(feature);
	}

	getFeatureValue(feature: string): boolean | number | undefined {
		if (this._featureQuotas.has(feature as NumericLicenseFeature)) {
			return this._featureQuotas.get(feature as NumericLicenseFeature);
		} else if (this._enabledFeatures.has(feature as BooleanLicenseFeature)) {
			return true;
		}
		return undefined;
	}

	enable(feature: BooleanLicenseFeature) {
		this._enabledFeatures.add(feature);
	}

	disable(feature: BooleanLicenseFeature) {
		this._enabledFeatures.delete(feature);
	}

	setQuota(feature: NumericLicenseFeature, quota: number) {
		this._featureQuotas.set(feature, quota);
	}
}
