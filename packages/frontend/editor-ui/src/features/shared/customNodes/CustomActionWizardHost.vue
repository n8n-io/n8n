<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { CUSTOM_NODES_MODULE_ID, CustomActionWizardModal } from '@n8n/frontend-module-custom-nodes';
import { useCustomActionWizard } from './useCustomActionWizard';

/**
 * The one wizard instance of the editor. The entry points in the nodes panel and in the node
 * settings open it with `useCustomActionWizard().open(data)`. After a save, the module store
 * reloads, and the push `nodeDescriptionUpdated` reloads the node types for the nodes panel.
 */
const settingsStore = useSettingsStore();
const isModuleActive = computed(() => settingsStore.isModuleActive(CUSTOM_NODES_MODULE_ID));

const { isOpen, data } = useCustomActionWizard();
</script>

<template>
	<CustomActionWizardModal v-if="isModuleActive" v-model:open="isOpen" :data="data" />
</template>
