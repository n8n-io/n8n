<template>
	<div
			v-if="isOpen(name) || keepAlive"
	>
		<slot
			:modalName="name"
			:active="isActive(name)"
			:open="isOpen(name)"
			:activeId="getActiveId(name)"
			:mode="getMode(name)"
			:data="getData(name)"
		></slot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "ModalRoot",
	props: ["name", "keepAlive"],
	methods: {
		isActive(name: string) {
			return this.$store.getters['ui/isModalActive'](name);
		},
		isOpen(name: string) {
			return this.$store.getters['ui/isModalOpen'](name);
		},
		getData(name: string) {
			return this.$store.getters['ui/getModalData'](name);
		},
		getMode(name: string) {
			return this.$store.getters['ui/getModalMode'](name);
		},
		getActiveId(name: string) {
			return this.$store.getters['ui/getModalActiveId'](name);
		},
	},
});
</script>
