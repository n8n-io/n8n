<template>
	<div
			v-if="isOpen(name)"
	>
		<slot :modalName="name" :active="isActive(name)"></slot>	
	</div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	name: "ModalRoot",
	props: ["name"],
	methods: {
		isActive(name: string) {
			return this.$store.getters['ui/isModalActive'](name);
		},
		isOpen(name: string) {
			return this.$store.getters['ui/isModalOpen'](name);
		},
	},
});
</script>
