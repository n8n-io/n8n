<script setup lang="ts">
import { isUiExtensionOpenableUrl } from '@n8n/api-types';
import {
	loadSidePanel,
	type ViewOpenTarget,
	type ViewRuntimeAssets,
} from '@n8n/frontend-module-ui-extensions';
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
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
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

const router = useRouter();
const rootStore = useRootStore();
const pushConnectionStore = usePushConnectionStore();
const settingsStore = useSettingsStore();
const locale = computed(() => rootStore.defaultLocale);
const runtime = shallowRef<ViewRuntimeAssets | null>(null);

/**
 * The view runtime is a separate bundle that the frame loads from a string.
 * It is about 1 MB, so it loads only when the panel mounts.
 */
async function loadRuntime() {
	const [{ default: js }, { default: css }] = await Promise.all([
		import('@n8n/ui-extension-runtime/runtime.iife.js?raw'),
		import('@n8n/ui-extension-runtime/runtime.css?raw'),
	]);
	runtime.value = { js, css };
}

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

/** A built-in view asks to open a run, or a page in a service. The module drops other views' asks. */
function onOpen(target: ViewOpenTarget) {
	if (target.kind === 'execution') {
		void router.push({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { workflowId: target.workflowId, executionId: target.executionId },
		});
		return;
	}
	if (isUiExtensionOpenableUrl(target.url))
		window.open(target.url, '_blank', 'noopener,noreferrer');
}

onMounted(() => {
	void loadRuntime();
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
		@open="onOpen"
	/>
</template>
