import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsageStore } from '@/features/settings/usage/usage.store';

// Module-cached so the canvas info card + side pane share one fetch.
let licensePromise: Promise<void> | null = null;

export function useEvaluationsLicense() {
	const usageStore = useUsageStore();
	const settingsStore = useSettingsStore();
	const isLicensed = computed(() => usageStore.workflowsWithEvaluationsLimit !== 0);
	const isResolved = computed(() => usageStore.hasLoadedLicense);

	async function ensureLicenseLoaded(): Promise<void> {
		// A preview embed has no session, so `/rest/license` can only answer 401.
		// The license stays unresolved, which keeps every evaluation surface
		// hidden — the correct state for a read-only preview.
		if (settingsStore.isPreviewMode) return;

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
