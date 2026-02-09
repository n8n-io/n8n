<script setup lang="ts">
import BannerStack from '@/features/shared/banners/components/BannerStack.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';

const route = useRoute();

const isDemoMode = computed(() => route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF);
</script>

<template>
	<div id="banners" :class="$style.banners">
		<BannerStack v-if="!isDemoMode" />
	</div>
</template>

<style lang="scss" module>
.banners {
	z-index: var(--top-banners--z);
}
</style>
