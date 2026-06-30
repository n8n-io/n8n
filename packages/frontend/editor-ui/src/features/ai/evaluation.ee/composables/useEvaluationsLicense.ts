import { computed } from 'vue';
import { useUsageStore } from '@/features/settings/usage/usage.store';

// Module-cached so the canvas info card + side pane share one fetch.
let licensePromise: Promise<void> | null = null;

export function useEvaluationsLicense() {
	const usageStore = useUsageStore();
	const isLicensed = computed(() => usageStore.workflowsWithEvaluationsLimit !== 0);
	const isResolved = computed(() => usageStore.hasLoadedLicense);

	async function ensureLicenseLoaded(): Promise<void> {
		if (!licensePromise) {
			licensePromise = usageStore.getLicenseInfo().catch(() => {
				// Swallow — surfaces default to hidden/paywalled, which is the safe state.
				licensePromise = null;
			});
		}
		await licensePromise;
	}

	return { isLicensed, isResolved, ensureLicenseLoaded };
}
