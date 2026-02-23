<script lang="ts" setup>
import BaseBanner from './BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
</script>

<template>
	<BaseBanner name="RECOVERY_MODE" theme="warning" custom-icon="info" :dismissible="false">
		<template #mainContent>
			<span>{{ locale.baseText('banners.recoveryMode.message') }}</span>
		</template>
	</BaseBanner>
</template>
