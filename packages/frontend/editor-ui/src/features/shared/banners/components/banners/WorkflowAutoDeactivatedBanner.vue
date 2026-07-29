<script lang="ts" setup>
import BaseBanner from './BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
</script>

<template>
	<BaseBanner name="WORKFLOW_AUTO_DEACTIVATED" theme="warning" custom-icon="info">
		<template #mainContent>
			<span>
				{{ locale.baseText('banners.workflowAutoDeactivated.message') }}
			</span>
		</template>
	</BaseBanner>
</template>
