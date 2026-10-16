<script setup lang="ts">
import { computed } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import AgentSkillEditor, { type AgentSkillEditorData } from './AgentSkillEditor.vue';

const props = defineProps<{
	modalName: string;
	data: AgentSkillEditorData;
}>();

const uiStore = useUIStore();
const open = computed(() => uiStore.modalsById[props.modalName]?.open === true);
</script>

<template>
	<AgentSkillEditor :data="data" :open="open" @close="uiStore.closeModal(modalName)" />
</template>
