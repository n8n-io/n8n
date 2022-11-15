import { activateLicense, renewLicense } from "@/api/license.ee";
import { STORES } from "@/constants";
import { LicenseFeatureExpanded, LicenseResponse, LicenseState } from "@/Interface";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";

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
	if (!features) {
		return [];
	}

	return Object.keys(features).map((id): LicenseFeatureExpanded => {
		return {
			id,
			value: resp.features[id],
			...features[id],
		};
	});
}
