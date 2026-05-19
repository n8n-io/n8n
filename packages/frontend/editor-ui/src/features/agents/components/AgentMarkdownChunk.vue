<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';

defineProps<{
	source: string;
}>();
</script>

<template>
	<VueMarkdown :source="source" :class="$style.markdown" />
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins' as ds-mixins;

.markdown {
	@include ds-mixins.markdown-content;
}
</style>
