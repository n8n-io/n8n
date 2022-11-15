import { activateLicense, renewLicense } from "@/api/license.ee";
import { STORES } from "@/constants";
import { LicenseFeatureExpanded, LicenseResponse, LicenseState } from "@/Interface";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";
import semver from 'semver';
import { useSettingsStore } from "./settings";

export const useLicenseStore = defineStore(STORES.LICENSE, {
	state: (): LicenseState => ({
		license: undefined,
	}),
	getters: {
		features(): LicenseFeatureExpanded[] {
			if (!this.license) {
				return [];
			}
			return getLicenseFeatures(this.license);
		},
	},
	actions: {
		async activateLicense(activationKey: string) {
			this.license = await activateLicense(
				useRootStore().getRestApiContext,
				{
					activationKey,
				},
			);
		},
		async renewLicense() {
			this.license = await renewLicense(
				useRootStore().getRestApiContext,
			);
		},
	},
});

function getLicenseFeatures(resp: LicenseResponse): LicenseFeatureExpanded[] {
	const features = resp.productInfo.features;
	const settings = useSettingsStore();
	if (!features) {
		return [];
	}

	return Object.keys(features).map((id): LicenseFeatureExpanded => {
		const supported = features[id].supportedVersions;
		const minVersion = supported ? semver.minVersion(supported): null;

		return {
			id,
			value: resp.features[id],
			unsupported: minVersion? semver.lt(settings.versionCli, minVersion): false,
			minVersion: minVersion && typeof minVersion === 'object'? minVersion.raw: null,
			...features[id],
		};
	});
}
