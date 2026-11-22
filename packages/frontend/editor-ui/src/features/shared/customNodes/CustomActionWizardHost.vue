<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	CUSTOM_NODES_MODULE_ID,
	loadCustomActionWizardModal,
} from '@n8n/frontend-module-custom-nodes';
import { useCustomActionWizard } from './useCustomActionWizard';

const CustomActionWizardModal = defineAsyncComponent(loadCustomActionWizardModal);

/**
 * The one wizard instance of the editor. The entry points in the nodes panel and in the node
 * settings open it with `useCustomActionWizard().open(data)`. After a save, the module store
 * reloads, and the push `nodeDescriptionUpdated` reloads the node types for the nodes panel.
 */
const settingsStore = useSettingsStore();
const isModuleActive = computed(() => settingsStore.isModuleActive(CUSTOM_NODES_MODULE_ID));

const { isOpen, data } = useCustomActionWizard();

// Load the wizard on the first opening. It stays mounted after, so it can close with its animation.
const wasOpened = ref(isOpen.value);
watch(isOpen, (open) => {
	if (open) wasOpened.value = true;
});
</script>

<template>
	<CustomActionWizardModal v-if="isModuleActive && wasOpened" v-model:open="isOpen" :data="data" />
</template>
