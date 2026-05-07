import { useStorage } from '@/app/composables/useStorage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';

const FIRST_OPEN_SEEN_STORAGE_KEY = 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_SEEN';
const FIRST_OPEN_DISMISSED_STORAGE_KEY = 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_DISMISSED';

type SurfaceMcpOnboardingSurface = 'tile' | 'first_open_modal';
type SurfaceMcpOnboardingClient = 'claude' | 'claude_code' | 'codex' | 'cursor' | 'chatgpt';
type SurfaceMcpOnboardingParameter = 'agent-prompt';

export const useSurfaceMcpToNewCloudUsersStore = defineStore(
	STORES.EXPERIMENT_SURFACE_MCP_TO_NEW_CLOUD_USERS,
	() => {
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();
		const firstOpenSeenStorage = useStorage(FIRST_OPEN_SEEN_STORAGE_KEY);
		const firstOpenDismissedStorage = useStorage(FIRST_OPEN_DISMISSED_STORAGE_KEY);

		const currentVariant = computed(() =>
			posthogStore.getVariant(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.name),
		);

		const isTileVariant = computed(() => {
			const variant = currentVariant.value;

			return (
				variant === SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1 ||
				variant === SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2
			);
		});
		const isFirstOpenModalVariant = computed(() => false);
		const isEnabled = computed(() => Boolean(currentVariant.value));

		const hasSeenFirstEligibleOpen = computed(() => firstOpenSeenStorage.value === 'true');
		const hasDismissedFirstOpenModal = computed(() => firstOpenDismissedStorage.value === 'true');

		const getTelemetryPayload = (payload: Record<string, unknown> = {}) => ({
			...payload,
			variant: currentVariant.value,
		});

		function markFirstEligibleOpenSeen() {
			firstOpenSeenStorage.value = 'true';
		}

		function dismissFirstOpenModal() {
			markFirstEligibleOpenSeen();
			firstOpenDismissedStorage.value = 'true';
		}

		function trackSurfaced(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding surfaced', getTelemetryPayload({ surface }));
		}

		function trackOpened(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding opened', getTelemetryPayload({ surface }));
		}

		function trackDismissed(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding dismissed', getTelemetryPayload({ surface }));
		}

		function trackEnableClicked(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding enable clicked', getTelemetryPayload({ surface }));
		}

		function trackEnabled(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding enabled', getTelemetryPayload({ surface }));
		}

		function trackClientSelected(client: SurfaceMcpOnboardingClient) {
			telemetry.track('MCP onboarding client selected', getTelemetryPayload({ client }));
		}

		function trackCopiedParameter(
			surface: SurfaceMcpOnboardingSurface,
			client: SurfaceMcpOnboardingClient,
			parameter: SurfaceMcpOnboardingParameter,
		) {
			telemetry.track(
				'MCP onboarding copied parameter',
				getTelemetryPayload({ surface, client, parameter }),
			);
		}

		function reset() {
			firstOpenSeenStorage.value = null;
			firstOpenDismissedStorage.value = null;
		}

		return {
			currentVariant,
			isEnabled,
			isTileVariant,
			isFirstOpenModalVariant,
			hasSeenFirstEligibleOpen,
			hasDismissedFirstOpenModal,
			markFirstEligibleOpenSeen,
			dismissFirstOpenModal,
			trackSurfaced,
			trackOpened,
			trackDismissed,
			trackEnableClicked,
			trackEnabled,
			trackClientSelected,
			trackCopiedParameter,
			reset,
		};
	},
);
