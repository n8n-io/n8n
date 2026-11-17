<script setup lang="ts">
import { loadSidePanel, UI_EXTENSIONS_HOST_KEY } from '@n8n/frontend-module-ui-extensions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	computed,
	defineAsyncComponent,
	inject,
	onBeforeUnmount,
	onMounted,
	ref,
	shallowRef,
	watch,
} from 'vue';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUiExtensionPageContext } from '@/app/composables/useUiExtensionPageContext';
import { useUiExtensionPanelData } from '@/app/composables/useUiExtensionPanelData';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

const SidePanel = defineAsyncComponent(loadSidePanel);

// App.vue provides the store, so it cannot read it. This child can.
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, shallowRef(null));
const { pageContext, workflowAvailableInMcp } = useUiExtensionPageContext(workflowDocumentStore);

// The panel sets this while a built-in view that shows run data is open.
const dataEnabled = ref(false);
const { panelData, refresh } = useUiExtensionPanelData(
	pageContext,
	workflowDocumentStore,
	dataEnabled,
);

const pushConnectionStore = usePushConnectionStore();
const settingsStore = useSettingsStore();
// App.vue provides the host. It loads the runtime once for the panel and the pages.
const host = inject(UI_EXTENSIONS_HOST_KEY, null);
const rootStore = useRootStore();
const locale = computed(() => host?.locale.value ?? rootStore.defaultLocale);
const runtime = computed(() => host?.runtime.value ?? null);

// A view from an MCP client must show without a reload on every page, and only
// some layouts open the push connection. The store counts the owners.
// The panel can mount after the login and before the full settings load. The
// push client type comes from those settings, so the connection waits for them.
let isPushConnected = false;
const stopWaitingForSettings = watch(
	() => settingsStore.pushBackend,
	(pushBackend) => {
		if (!pushBackend || isPushConnected) return;
		isPushConnected = true;
		pushConnectionStore.pushConnect();
	},
	{ immediate: true },
);

onMounted(() => {
	host?.loadRuntime();
});

onBeforeUnmount(() => {
	stopWaitingForSettings();
	if (isPushConnected) pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<SidePanel
		:page-context="pageContext"
		:workflow-available-in-mcp="workflowAvailableInMcp"
		v-model:data-enabled="dataEnabled"
		:runtime="runtime"
		:panel-data="panelData"
		:locale="locale"
		@refresh="refresh"
		@open="host?.open($event)"
	/>
</template>
