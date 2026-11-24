<script lang="ts" setup>
import { N8nMarkdown } from '@n8n/design-system';

defineProps<{
	text: string;
}>();
</script>

<template>
	<N8nMarkdown :class="$style.text" :content="text" />
</template>

<style module>
.text {
	--n8n-markdown--font-size--base: var(--font-size--xs);
	padding: var(--spacing--sm);
}
</style>
