<script setup lang="ts">
defineProps<{ demoUrl: string | null; hasMessages: boolean }>();
</script>

<template>
	<div :class="$style.iframeWrap">
		<iframe
			v-if="demoUrl"
			:class="$style.iframe"
			:src="demoUrl"
			sandbox="allow-scripts allow-forms allow-same-origin"
			title="Generated frontend preview"
		/>
		<div v-else-if="hasMessages" :class="$style.placeholder">
			v0 hasn't produced a preview yet. Try giving more detail or sending another message.
		</div>
		<div v-else :class="$style.placeholder">Send a prompt to generate a frontend.</div>
	</div>
</template>

<style module>
.iframeWrap {
	display: flex;
	flex: 1;
	min-height: 0;
}
.iframe {
	flex: 1;
	border: 0;
	width: 100%;
}
.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
	color: var(--color--text--tint-1);
}
</style>
