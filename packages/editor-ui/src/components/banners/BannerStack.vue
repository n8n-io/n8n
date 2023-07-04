<script setup lang="ts">
import TrialOverBanner from '@/components/banners/TrialOverBanner.vue';
import TrialBanner from '@/components/banners/TrialBanner.vue';
import V1Banner from '@/components/banners/V1Banner.vue';
</script>

<template>
	<div data-test-id="banner-stack">
		<trial-over-banner />
		<trial-banner />
		<v1-banner />
	</div>
</template>
