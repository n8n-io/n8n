<template>
	<img
		:src="basePath + 'n8n-logo-expanded.svg'"
		:class="$style.img"
		alt="n8n.io"
	/>
</template>

<script lang="ts">
import { useRootStore } from '@/stores/n8nRootStore';
import { mapStores } from 'pinia';
import Vue from 'vue';

export default Vue.extend({
	computed: {
		...mapStores(
			useRootStore,
		),
		basePath(): string {
			return this.rootStore.baseUrl;
		},
	},
});
</script>

<style lang="scss" module>
.img {
	height: 32px;
}
</style>
