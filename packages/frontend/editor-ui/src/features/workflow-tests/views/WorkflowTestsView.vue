<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
const locale = useI18n();
defineProps<{ workflowId: string }>();
</script>

<template>
	<div>
		<h2>{{ locale.baseText('workflowTests.list.title') }}</h2>
	</div>
</template>
