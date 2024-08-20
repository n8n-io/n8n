<script lang="ts" setup>
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import type { ITelemetrySettings } from 'n8n-workflow';
import { useProjectsStore } from '@/stores/projects.store';
import { computed, onMounted, watch, ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRoute } from 'vue-router';

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

watch(telemetry, () => {
	init();
});

watch(currentUserId, (userId) => {
	if (isTelemetryEnabled.value) {
		telemetryPlugin.identify(rootStore.instanceId, userId);
	}
});

watch(isTelemetryEnabledOnRoute, (enabled) => {
	if (enabled) {
		init();
	}
});

onMounted(() => {
	init();
});

function init() {
	if (isTelemetryInitialized.value || !isTelemetryEnabledOnRoute.value || !isTelemetryEnabled.value)
		return;

	telemetryPlugin.init(telemetry.value, {
		instanceId: rootStore.instanceId,
		userId: currentUserId.value,
		projectId: projectsStore.personalProject?.id,
		versionCli: rootStore.versionCli,
	});

	isTelemetryInitialized.value = true;
}
</script>

<template>
	<span v-show="false" />
</template>
