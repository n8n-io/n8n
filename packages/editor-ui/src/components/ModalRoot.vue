<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';

defineProps<{
	name: string;
	keepAlive?: boolean;
}>();

defineSlots<{
	default: {
		modalName: string;
		active: boolean;
		open: boolean;
		activeId: string;
		mode: string;
		data: Record<string, unknown>;
	};
}>();

const uiStore = useUIStore();
</script>

<template>
	<div v-if="uiStore.modalsById[name].open || keepAlive">
		<slot
			:modal-name="name"
			:active="uiStore.isModalActiveById[name]"
			:open="uiStore.modalsById[name].open"
			:active-id="uiStore.modalsById[name].activeId"
			:mode="uiStore.modalsById[name].mode"
			:data="uiStore.modalsById[name].data"
		></slot>
	</div>
</template>
