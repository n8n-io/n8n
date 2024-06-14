<template>
	<div v-if="uiStore.isModalOpen(name) || keepAlive">
		<slot
			:modal-name="name"
			:active="uiStore.isModalActive(name)"
			:open="uiStore.isModalOpen(name)"
			:active-id="uiStore.getModalActiveId(name)"
			:mode="uiStore.getModalMode(name)"
			:data="uiStore.getModalData(name)"
		></slot>
	</div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import type { ModalKey } from '@/Interface';

defineProps<{
	name: ModalKey;
	keepAlive?: boolean;
}>();

const uiStore = useUIStore();
</script>
