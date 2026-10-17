<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';

defineProps<{ text: string }>();
</script>

<template>
	<N8nCallout theme="secondary" iconless data-test-id="gateway-credits-promotion">
		{{ text }}
	</N8nCallout>
</template>
