import { useStorage } from '@/app/composables/useStorage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import type { MCPOnboardingClient as SurfaceMcpOnboardingClient } from '../components/onboarding/types';

const FIRST_OPEN_SEEN_STORAGE_KEY = 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_SEEN';
const FIRST_OPEN_DISMISSED_STORAGE_KEY = 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_DISMISSED';

type SurfaceMcpOnboardingSurface = 'tile' | 'first_open_modal';
type SurfaceMcpOnboardingEntryPoint = 'empty_state_tile';
type SurfaceMcpOnboardingParameter = 'agent-prompt' | 'server-url' | 'chatgpt-app-name';
type SurfaceMcpOnboardingSetupType = 'prompt' | 'chatgpt_custom_app';
type SurfaceMcpOnboardingSuppression =
	| 'app_selection'
	| 'builder_prompt'
	| 'recommended_templates'
	| 'no_create_permission';

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

		function trackEntryPointViewed(
			surface: SurfaceMcpOnboardingSurface,
			entryPoint: SurfaceMcpOnboardingEntryPoint,
			mcpAccessEnabled: boolean,
		) {
			telemetry.track(
				'MCP onboarding entry point viewed',
				getTelemetryPayload({
					surface,
					entry_point: entryPoint,
					mcp_access_enabled: mcpAccessEnabled,
				}),
			);
		}

		function trackOpportunityViewed(
			surface: SurfaceMcpOnboardingSurface,
			entryPoint: SurfaceMcpOnboardingEntryPoint,
			surfaceAvailable: boolean,
			suppressedBy: SurfaceMcpOnboardingSuppression | null,
			mcpAccessEnabled: boolean,
		) {
			telemetry.track(
				'MCP onboarding opportunity viewed',
				getTelemetryPayload({
					surface,
					entry_point: entryPoint,
					eligible: true,
					surface_available: surfaceAvailable,
					suppressed_by: suppressedBy,
					mcp_access_enabled: mcpAccessEnabled,
				}),
			);
		}

		function trackOpened(
			surface: SurfaceMcpOnboardingSurface,
			payload: { entryPoint?: SurfaceMcpOnboardingEntryPoint; mcpAccessEnabled?: boolean } = {},
		) {
			telemetry.track(
				'MCP onboarding opened',
				getTelemetryPayload({
					surface,
					...(payload.entryPoint ? { entry_point: payload.entryPoint } : {}),
					...(payload.mcpAccessEnabled !== undefined
						? { mcp_access_enabled: payload.mcpAccessEnabled }
						: {}),
				}),
			);
		}

		function trackDismissed(
			surface: SurfaceMcpOnboardingSurface,
			payload: {
				activeClient?: SurfaceMcpOnboardingClient;
				enabledDuringThisOpen?: boolean;
				mcpAccessEnabled?: boolean;
			} = {},
		) {
			telemetry.track(
				'MCP onboarding dismissed',
				getTelemetryPayload({
					surface,
					...(payload.activeClient ? { active_client: payload.activeClient } : {}),
					...(payload.enabledDuringThisOpen !== undefined
						? { enabled_during_this_open: payload.enabledDuringThisOpen }
						: {}),
					...(payload.mcpAccessEnabled !== undefined
						? { mcp_access_enabled: payload.mcpAccessEnabled }
						: {}),
				}),
			);
		}

		function trackEnableClicked(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding enable clicked', getTelemetryPayload({ surface }));
		}

		function trackEnabled(surface: SurfaceMcpOnboardingSurface) {
			telemetry.track('MCP onboarding enabled', getTelemetryPayload({ surface }));
		}

		function trackEnableFailed(surface: SurfaceMcpOnboardingSurface, errorType: string) {
			telemetry.track(
				'MCP onboarding enable failed',
				getTelemetryPayload({ surface, error_type: errorType }),
			);
		}

		function trackClientSelected(
			surface: SurfaceMcpOnboardingSurface,
			client: SurfaceMcpOnboardingClient,
		) {
			telemetry.track('MCP onboarding client selected', getTelemetryPayload({ surface, client }));
		}

		function trackSetupShown(
			surface: SurfaceMcpOnboardingSurface,
			client: SurfaceMcpOnboardingClient,
			setupType: SurfaceMcpOnboardingSetupType,
		) {
			telemetry.track(
				'MCP onboarding setup shown',
				getTelemetryPayload({ surface, client, setup_type: setupType }),
			);
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
			trackEntryPointViewed,
			trackOpportunityViewed,
			trackOpened,
			trackDismissed,
			trackEnableClicked,
			trackEnabled,
			trackEnableFailed,
			trackClientSelected,
			trackSetupShown,
			trackCopiedParameter,
			reset,
		};
	},
);
