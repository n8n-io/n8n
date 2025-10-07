<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
</script>

<template>
	<BaseBanner
		custom-icon="shield"
		theme="danger"
		name="SAFE_MODE"
		:class="$style.safeModeContainer"
	>
		<template #mainContent>
			<span v-n8n-html="locale.baseText('banners.safeMode.message')"></span>
		</template>
	</BaseBanner>
</template>

<style lang="scss" module>
.safeModeContainer {
	a,
	.link {
		font-weight: var(--font-weight-bold);
		text-decoration: underline;
	}
}
</style>
