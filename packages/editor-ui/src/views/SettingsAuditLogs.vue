<script lang="ts" setup>
import { useI18n } from '@/composables';

const { i18n: locale } = useI18n();
</script>

<template>
	<div>
		<n8n-heading size="2xlarge" tag="h1">{{
			locale.baseText('settings.auditLogs.title')
		}}</n8n-heading>
	</div>
</template>

<style lang="scss" module></style>
