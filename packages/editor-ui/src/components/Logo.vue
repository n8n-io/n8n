<template>
	<img :src="basePath + 'n8n-logo-expanded.svg'" :class="$style.img" alt="n8n.io" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRoot.store';

export default defineComponent({
	computed: {
		...mapStores(useRootStore),
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
