<template>
	<div
			v-if="uiStore.isModalOpen(name) || keepAlive"
	>
		<slot
			:modalName="name"
			:active="uiStore.isModalActive(name)"
			:open="uiStore.isModalOpen(name)"
			:activeId="uiStore.getModalActiveId(name)"
			:mode="uiStore.getModalMode(name)"
			:data="uiStore.getModalData(name)"
		></slot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { useUIStore } from '@/stores/ui';
import { mapStores } from "pinia";

export default Vue.extend({
	name: "ModalRoot",
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
