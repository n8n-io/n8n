<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'UiDebug' });

// Defaults to the whole state, but takes any expression, so it can show a slice.
const props = defineProps<{ value?: unknown }>();

const pretty = computed(() => {
	try {
		return JSON.stringify(props.value, null, 2) ?? String(props.value);
	} catch {
		// Cyclic state, most likely.
		return String(props.value);
	}
});
</script>

<template>
	<pre class="ui-debug">{{ pretty }}</pre>
</template>

<style scoped>
.ui-debug {
	margin: 0;
	padding: var(--spacing--2xs, 8px);
	overflow: auto;
	max-height: 320px;
	border: 1px solid var(--color--foreground, #dbdfe7);
	border-radius: var(--radius, 4px);
	background: var(--background--surface, #f7f7f8);
	font-family: var(--font-family--monospace, monospace);
	font-size: 12px;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
