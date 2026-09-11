<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';

import InstanceAiSidebar from '@/features/ai/instanceAi/components/InstanceAiSidebar.vue';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { getAppBuilderTargetFromThreadMetadata } from '@/features/ai/instanceAi/instanceAi.threadRuntime';
import { AppThreadScopeKey, provideSidebarState } from '@/features/ai/instanceAi/instanceAiLayout';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import InstanceAiThreadView from '@/features/ai/instanceAi/InstanceAiThreadView.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { APP_DETAILS, APP_NEW, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';

const props = defineProps<{
	projectId: string;
	/** Absent on the new-app page: the thread starts without an app and the agent creates one. */
	appId?: string;
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
	...(props.appId ? { appId: props.appId } : {}),
	projectId: props.projectId,
	name: app.value?.name ?? i18n.baseText('apps.new.title'),
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

// No app yet: a plain project thread; `apps(action="create")` binds it to the app it makes.
const createUnboundThread = async () => {
	const id = uuidv4();
	try {
		await instanceAiStore.syncThread(id, props.projectId, {
			source: 'app_builder_page',
			origin: 'internal',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.new.error'));
		return undefined;
	}
	return id;
};

// `?thread=<id>` picks one of the app's threads, `?thread=new` starts another;
// otherwise the app resumes in its most recent thread, or a first one is created.
const resolveThread = async () => {
	const requested = requestedThreadId.value;
	if (!props.appId) {
		const known = requested && instanceAiStore.threads.some((thread) => thread.id === requested);
		const resolved = known ? requested : await createUnboundThread();
		if (!resolved) return;
		threadId.value = resolved;
		if (resolved !== requested) {
			await router.replace({
				name: APP_NEW,
				params: { projectId: props.projectId },
				query: { thread: resolved },
			});
		}
		return;
	}
	if (!app.value) return;
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
	// The route swap from new-app to the created app keeps the thread mounted.
	if (!(props.appId && threadId.value === requestedThreadId.value)) threadId.value = null;
	try {
		if (props.appId) {
			const [current, threads] = await Promise.all([
				appsStore.getApp(props.projectId, props.appId),
				appsStore.fetchThreads(props.projectId, props.appId),
				instanceAiStore.loadThreads(),
				appsStore.fetchBindings(props.projectId, props.appId),
			]);
			app.value = current;
			appThreadIds.value = threads.map((thread) => thread.id);
		} else {
			app.value = null;
			appThreadIds.value = [];
			await instanceAiStore.loadThreads();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.getDetails.error'));
		await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
		return;
	}
	if (threadId.value === null) await resolveThread();
};

// The app the agent created in this thread: written into the thread metadata by
// the preview panel once the app artifact shows, or already present after a reload.
const createdAppId = computed(() => {
	if (props.appId || !threadId.value) return undefined;
	const target = getAppBuilderTargetFromThreadMetadata(
		instanceAiStore.getThreadMetadata(threadId.value),
	);
	if (target?.appId) return target.appId;
	for (const entry of instanceAiStore
		.getOrCreateRuntime(threadId.value)
		.producedArtifacts.values()) {
		if (entry.type === 'app') return entry.id;
	}
	return undefined;
});

// Same component on both routes, so the thread view stays mounted across the swap.
watch(createdAppId, async (appId) => {
	if (!appId || !threadId.value) return;
	await router.replace({
		name: APP_DETAILS,
		params: { projectId: props.projectId, appId },
		query: { thread: threadId.value },
	});
});

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

// A run may have bound or unbound resources; the preview tabs read the store.
watch(
	() => (threadId.value ? instanceAiStore.getOrCreateRuntime(threadId.value).isStreaming : false),
	(streaming, wasStreaming) => {
		if (wasStreaming && !streaming && props.appId) {
			void appsStore.fetchBindings(props.projectId, props.appId).catch(() => {});
		}
	},
);

watch(requestedThreadId, async (requested) => {
	if (requested && requested !== threadId.value) await resolveThread();
});
</script>

<template>
	<div :class="$style.container" data-test-id="app-builder-view">
		<InstanceAiSidebar v-if="props.appId" :app-scope="appScope" @resize="handleSidebarResize" />
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
