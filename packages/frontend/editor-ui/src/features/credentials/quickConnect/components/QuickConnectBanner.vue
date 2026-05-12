<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';

const { text } = defineProps<{
	text: string;
}>();
</script>

<template>
	<N8nCallout v-if="text" theme="secondary" iconless data-test-id="quick-connect-banner">
		<div v-n8n-html="text"></div>
	</N8nCallout>
</template>
