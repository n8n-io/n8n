import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { OTEL_SETTINGS_VIEW } from '@n8n/frontend-module-otel';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useUserHelpers } from '@/app/composables/useUserHelpers';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { showsPlaceholderPage } from '@/app/moduleInitializer/placeholderPage';

/**
 * Which Observability pages the current user can open. The sidebar link and the
 * overview page share this, so the link never leads to an empty page.
 */
export function useObservabilityPages() {
	const router = useRouter();
	const settingsStore = useSettingsStore();
	const { canUserAccessRouteByName } = useUserHelpers(router);

	// An unlicensed instance still gets the page: it shows the paywall.
	const canOpenLogStreaming = computed(
		() =>
			(settingsStore.isModuleActive('log-streaming') ||
				showsPlaceholderPage(EnterpriseEditionFeature.LogStreaming)) &&
			canUserAccessRouteByName(VIEWS.LOG_STREAMING_SETTINGS),
	);

	const canOpenOpenTelemetry = computed(
		() => settingsStore.isModuleActive('otel') && canUserAccessRouteByName(OTEL_SETTINGS_VIEW),
	);

	return { canOpenLogStreaming, canOpenOpenTelemetry };
}
