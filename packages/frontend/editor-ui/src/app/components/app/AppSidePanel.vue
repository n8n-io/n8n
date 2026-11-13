<script setup lang="ts">
import { loadSidePanel, type ViewRuntimeAssets } from '@n8n/frontend-module-ui-extensions';
import { defineAsyncComponent, inject, onBeforeUnmount, onMounted, shallowRef } from 'vue';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUiExtensionPageContext } from '@/app/composables/useUiExtensionPageContext';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

const SidePanel = defineAsyncComponent(loadSidePanel);

// App.vue provides the store, so it cannot read it. This child can.
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, shallowRef(null));
const { pageContext, workflowAvailableInMcp } = useUiExtensionPageContext(workflowDocumentStore);

const pushConnectionStore = usePushConnectionStore();
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

onMounted(() => {
	// A view from an MCP client must show without a reload on every page, and only
	// some layouts open the push connection. The store counts the owners.
	pushConnectionStore.pushConnect();
	void loadRuntime();
});

onBeforeUnmount(() => {
	pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<SidePanel
		:page-context="pageContext"
		:workflow-available-in-mcp="workflowAvailableInMcp"
		:runtime="runtime"
	/>
</template>
