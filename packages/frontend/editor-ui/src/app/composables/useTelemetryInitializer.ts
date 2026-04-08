import type { ITelemetrySettings } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { computed, onMounted, watch, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRoute } from 'vue-router';

/**
 * Initializes the telemetry for the application
 */
export function useTelemetryInitializer() {
	const isTelemetryInitialized = ref(false);

	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();
	const telemetryPlugin = useTelemetry();
	const route = useRoute();

	const currentUserId = computed((): string => {
		return usersStore.currentUserId ?? '';
	});

	const isTelemetryEnabledOnRoute = computed((): boolean => {
		const routeMeta = route.meta as { telemetry?: { disabled?: boolean } } | undefined;
		return routeMeta?.telemetry ? !routeMeta.telemetry.disabled : true;
	});

	const telemetry = computed((): ITelemetrySettings => {
		return settingsStore.telemetry;
	});

	const isTelemetryEnabled = computed((): boolean => {
		return !!telemetry.value?.enabled;
	});

	function init() {
		if (
			isTelemetryInitialized.value ||
			!isTelemetryEnabledOnRoute.value ||
			!isTelemetryEnabled.value
		)
			return;

		telemetryPlugin.init(telemetry.value, {
			instanceId: rootStore.instanceId,
			userId: currentUserId.value,
			projectId: projectsStore.personalProject?.id,
			versionCli: rootStore.versionCli,
		});

		isTelemetryInitialized.value = true;
	}

	watch(telemetry, () => {
		init();
	});

	watch(isTelemetryEnabledOnRoute, (enabled) => {
		if (enabled) {
			init();
		}
	});

	onMounted(() => {
		init();
	});
}
