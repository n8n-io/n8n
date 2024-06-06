<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';

const props = defineProps<{
	name: string;
	keepAlive?: boolean;
}>();

const uiStore = useUIStore();
</script>

<template>
	<div v-if="uiStore.isModalOpen(props.name) || props.keepAlive">
		<slot
			:modal-name="props.name"
			:active="uiStore.isModalActive(props.name)"
			:open="uiStore.isModalOpen(props.name)"
			:active-id="uiStore.getModalActiveId(props.name)"
			:mode="uiStore.getModalMode(props.name)"
			:data="uiStore.getModalData(props.name)"
		></slot>
	</div>
</template>
