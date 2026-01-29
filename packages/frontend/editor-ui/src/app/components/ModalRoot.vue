<script setup lang="ts">
import { useUIStore } from '@/app/stores/ui.store';

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
	<div v-if="(uiStore.modalsById[name]?.open ?? false) || keepAlive">
		<slot
			:modal-name="name"
			:active="uiStore.isModalActiveById[name] ?? false"
			:open="uiStore.modalsById[name]?.open ?? false"
			:active-id="uiStore.modalsById[name]?.activeId ?? ''"
			:mode="uiStore.modalsById[name]?.mode ?? ''"
			:data="uiStore.modalsById[name]?.data ?? {}"
		></slot>
	</div>
</template>
