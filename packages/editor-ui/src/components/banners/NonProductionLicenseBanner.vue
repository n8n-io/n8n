<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
</script>

<template>
	<BaseBanner name="NON_PRODUCTION_LICENSE" :dismissible="false">
		<template #mainContent>
			<span>{{ locale.baseText('banners.nonProductionLicense.message') }}</span>
		</template>
	</BaseBanner>
</template>
