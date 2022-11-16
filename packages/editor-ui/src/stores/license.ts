import { activateLicense, renewLicense } from "@/api/license.ee";
import { STORES } from "@/constants";
import { LicenseFeatureExpanded, LicenseResponse, LicenseState } from "@/Interface";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";

// must be imported seperately to avoid circular dependency issue in semver
import lt from 'semver/functions/lt';
import minVersion from 'semver/ranges/min-version';
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
		const min = supported ? minVersion(supported): null;

		return {
			id,
			value: resp.features[id],
			unsupported: min? lt(settings.versionCli, min): false,
			minVersion: min && typeof min === 'object'? min.raw: null,
			...features[id],
		};
	});
}
