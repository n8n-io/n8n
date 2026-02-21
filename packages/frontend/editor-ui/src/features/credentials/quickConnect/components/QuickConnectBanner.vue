<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';

const { text } = defineProps<{
	text: string;
}>();
</script>

<template>
	<N8nCallout theme="secondary" iconless data-test-id="quick-connect-banner">
		{{ text }}
	</N8nCallout>
</template>
