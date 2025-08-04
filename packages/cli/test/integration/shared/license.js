'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.LicenseMocker = void 0;
class LicenseMocker {
	constructor() {
		this._enabledFeatures = new Set();
		this._defaultFeatures = new Set();
		this._featureQuotas = new Map();
		this._defaultQuotas = new Map();
	}
	mock(license) {
		license.isLicensed = this.isFeatureEnabled.bind(this);
		license.getValue = this.getFeatureValue.bind(this);
	}
	mockLicenseState(licenseState) {
		const licenseProvider = {
			isLicensed: this.isFeatureEnabled.bind(this),
			getValue: this.getFeatureValue.bind(this),
		};
		licenseState.setLicenseProvider(licenseProvider);
	}
	reset() {
		this._enabledFeatures = new Set(this._defaultFeatures);
		this._featureQuotas = new Map(this._defaultQuotas);
	}
	setDefaults(defaults) {
		this._defaultFeatures = new Set(defaults.features ?? []);
		this._defaultQuotas = new Map(Object.entries(defaults.quotas ?? {}));
	}
	isFeatureEnabled(feature) {
		return this._enabledFeatures.has(feature);
	}
	getFeatureValue(feature) {
		if (this._featureQuotas.has(feature)) {
			return this._featureQuotas.get(feature);
		} else if (this._enabledFeatures.has(feature)) {
			return true;
		}
		return undefined;
	}
	enable(feature) {
		this._enabledFeatures.add(feature);
	}
	disable(feature) {
		this._enabledFeatures.delete(feature);
	}
	setQuota(feature, quota) {
		this._featureQuotas.set(feature, quota);
	}
}
exports.LicenseMocker = LicenseMocker;
//# sourceMappingURL=license.js.map
