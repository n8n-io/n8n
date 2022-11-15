import { activateLicense } from "@/api/license.ee";
import { STORES } from "@/constants";
import { LicenseState } from "@/Interface";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";

export const useLicenseStore = defineStore(STORES.LICENSE, {
	state: (): LicenseState => ({
		productInfo: undefined,
	}),
	actions: {
		async activateLicense(activationKey: string) {
			const response = await activateLicense(
				useRootStore().getRestApiContext,
				{
					activationKey,
				},
			);
			this.productInfo = response.productInfo;
		},
	},
});
