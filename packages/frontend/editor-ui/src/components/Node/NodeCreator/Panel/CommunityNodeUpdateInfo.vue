<script setup lang="ts">
import { N8nNotice } from '@n8n/design-system';
import { i18n } from '@n8n/i18n';
</script>

<template>
	<N8nNotice
		theme="info"
		:style="{
			backgroundColor: 'var(--color-secondary-tint-3)',
			borderColor: 'var(--color-secondary)',
			marginTop: '0',
		}"
	>
		{{ i18n.baseText('communityNodeUpdateInfo.available') }}
	</N8nNotice>
</template>

<style lang="scss" module></style>
