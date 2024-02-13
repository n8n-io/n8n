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

<script lang="ts">
import { defineComponent } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';

export default defineComponent({
	name: 'ModalRoot',
	props: {
		name: {
			type: String,
			required: true,
		},
		keepAlive: {
			type: Boolean,
		},
	},
	computed: {
		...mapStores(useUIStore),
	},
});
</script>
