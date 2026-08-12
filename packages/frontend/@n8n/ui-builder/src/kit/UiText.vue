<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineOptions({ name: 'UiText' });

// Matching the descriptor's default, so a node without the prop and a node
// created with it read the same.
withDefaults(defineProps<{ text?: string }>(), { text: 'Text' });
</script>

<template>
	<N8nText>{{ text }}</N8nText>
</template>
