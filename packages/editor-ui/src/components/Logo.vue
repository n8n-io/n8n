<template>
	<img :src="logoPath" :class="$style.img" alt="n8n.io" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useRootStore, useSettingsStore } from '@/stores';

export default defineComponent({
	computed: {
		...mapStores(useRootStore, useSettingsStore),
		basePath(): string {
			return this.rootStore.baseUrl;
		},
		logoPath(): string {
			return (
				this.basePath +
				(this.settingsStore.settings.isBetaRelease ? 'n8n-beta-logo.svg' : 'n8n-logo-expanded.svg')
			);
		},
	},
});
</script>

<style lang="scss" module>
.img {
	height: 32px;
}
</style>
