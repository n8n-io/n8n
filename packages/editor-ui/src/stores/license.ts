import { activateLicense } from "@/api/license.ee";
import { STORES } from "@/constants";
import { LicenseState } from "@/Interface";
import { defineStore } from "pinia";
import { useRootStore } from "./n8nRootStore";

export const useLicenseStore = defineStore(STORES.LICENSE, {
	state: (): LicenseState => ({
	}),
	actions: {
		async activateLicense(activationKey: string) {
			await activateLicense(
				useRootStore().getRestApiContext,
				{
					activationKey,
				},
			);
		},
	},
});
