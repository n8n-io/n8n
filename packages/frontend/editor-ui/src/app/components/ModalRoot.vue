<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
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

// Resolves to a closed state while `name` is not registered, so this renders
// nothing instead of throwing when it mounts ahead of registration.
const modalState = computed(() => uiStore.modalsById[props.name]);
</script>

<template>
	<div v-if="modalState.open || keepAlive">
		<slot
			:modal-name="name"
			:active="uiStore.isModalActiveById[name]"
			:open="modalState.open"
			:active-id="modalState.activeId"
			:mode="modalState.mode"
			:data="modalState.data"
		></slot>
	</div>
</template>
