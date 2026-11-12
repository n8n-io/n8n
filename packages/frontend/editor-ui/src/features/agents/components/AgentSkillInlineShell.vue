<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ busy?: boolean }>();
</script>

<template>
	<div :class="$style.editor" :aria-busy="busy" data-testid="agent-skill-inline-editor">
		<div :class="$style.body"><slot /></div>
		<div v-if="$slots.footerActions" :class="$style.footer">
			<slot name="footerActions" />
		</div>
	</div>
</template>

<style module>
.editor {
	container: skill-editor / inline-size;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	overflow: auto;
	scrollbar-gutter: stable;
}

.footer {
	display: flex;
	justify-content: flex-end;
	flex-shrink: 0;
	padding: var(--spacing--md) var(--spacing--lg);
	border-top: var(--border);
}
</style>
