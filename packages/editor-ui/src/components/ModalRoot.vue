<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { mapStores } from 'pinia';
import type { ModalKey } from '@/Interface';

export default defineComponent({
	name: 'ModalRoot',
	props: {
		name: {
			type: String as PropType<ModalKey>,
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
