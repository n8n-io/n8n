<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import InstanceAiSidebar from '@/features/ai/instanceAi/components/InstanceAiSidebar.vue';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { AppThreadScopeKey, provideSidebarState } from '@/features/ai/instanceAi/instanceAiLayout';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import InstanceAiThreadView from '@/features/ai/instanceAi/InstanceAiThreadView.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	appId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const appsStore = useAppsStore();
const instanceAiStore = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const { createAppArtifactThread } = useInstanceAiHandoff();

const { handleResize: handleSidebarResize } = provideSidebarState();

const app = ref<App | null>(null);
const threadId = ref<string | null>(null);

const appScope = computed(() => ({
	appId: props.appId,
	projectId: props.projectId,
	name: app.value?.name ?? '',
}));
provide(AppThreadScopeKey, appScope);

/** Ids of the threads bound to this app, newest activity first, as the server knows them. */
const appThreadIds = ref<string[]>([]);

const requestedThreadId = computed(() =>
	typeof route.query.thread === 'string' ? route.query.thread : undefined,
);

const createThread = async (current: App) => {
	return await createAppArtifactThread(
		{ type: 'app', appId: current.id, projectId: props.projectId, name: current.name },
		{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: current.id } },
	);
};

// `?thread=<id>` picks one of the app's threads, `?thread=new` starts another;
// otherwise the app resumes in its most recent thread, or a first one is created.
const resolveThread = async () => {
	if (!app.value) return;
	const requested = requestedThreadId.value;
	const existing =
		requested && requested !== 'new'
			? appThreadIds.value.find((id) => id === requested)
			: undefined;
	const resumed = existing ?? (requested === 'new' ? undefined : appThreadIds.value[0]);
	const resolved = resumed ?? (await createThread(app.value));
	if (!resolved) return;
	if (!resumed) appThreadIds.value = [resolved, ...appThreadIds.value];
	threadId.value = resolved;
	if (resolved !== requested) {
		await router.replace({
			name: APP_DETAILS,
			params: { projectId: props.projectId, appId: props.appId },
			query: { thread: resolved },
		});
	}
};

const initialize = async () => {
	threadId.value = null;
	try {
		const [current, threads] = await Promise.all([
			appsStore.getApp(props.projectId, props.appId),
			appsStore.fetchThreads(props.projectId, props.appId),
			instanceAiStore.loadThreads(),
		]);
		app.value = current;
		appThreadIds.value = threads.map((thread) => thread.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.getDetails.error'));
		await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
		return;
	}
	await resolveThread();
};

onMounted(() => {
	void initialize();
	void instanceAiStore.fetchCredits();
	// Same preferences the assistant page loads before its composer renders.
	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(async () => await settingsStore.ensurePreferencesLoaded())
		.catch(() => {});
});

watch(() => props.appId, initialize);

watch(requestedThreadId, async (requested) => {
	if (requested && requested !== threadId.value) await resolveThread();
});
</script>

<template>
	<div :class="$style.container" data-test-id="app-builder-view">
		<InstanceAiSidebar :app-scope="appScope" @resize="handleSidebarResize" />
		<InstanceAiThreadView v-if="threadId" :key="threadId" :thread-id="threadId" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	min-width: 0;
	overflow: hidden;
}
</style>
