<template>
	<img :src="logoPath" :class="$style.img" alt="n8n.io" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUIStore } from '@/stores/ui.store';

const rootStore = useRootStore();
const uiStore = useUIStore();

const basePath = computed(() => rootStore.baseUrl);
const logoPath = computed(() => basePath.value + uiStore.logo);
</script>

<style lang="scss" module>
.img {
	height: 32px;
}
</style>
