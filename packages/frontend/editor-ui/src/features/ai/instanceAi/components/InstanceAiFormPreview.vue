<script lang="ts" setup>
import { ref } from 'vue';
import { N8nText } from '@n8n/design-system';

defineProps<{
	previewHtml: string;
	themeLabel?: string;
	nodeName?: string;
}>();

const iframeEl = ref<HTMLIFrameElement | null>(null);

// Auto-size the iframe to its content (copied from the editor's form appearance
// preview) so the rendered form isn't clipped or scrollable in the chat.
function onIframeLoad() {
	const iframe = iframeEl.value;
	if (!iframe?.contentDocument) return;

	const doc = iframe.contentDocument;
	doc.documentElement.style.height = 'auto';
	if (doc.body) doc.body.style.height = 'auto';

	function updateHeight() {
		if (!iframe?.contentDocument) return;
		const contentH = Math.max(
			iframe.contentDocument.documentElement.scrollHeight,
			iframe.contentDocument.body?.scrollHeight ?? 0,
		);
		iframe.style.height = `${contentH}px`;
	}

	updateHeight();

	doc.querySelectorAll('img').forEach((img) => {
		if (!img.complete) {
			img.addEventListener('load', updateHeight, { once: true });
			img.addEventListener('error', updateHeight, { once: true });
		}
	});
}
</script>

<template>
	<div :class="$style.wrapper">
		<div v-if="themeLabel || nodeName" :class="$style.header">
			<N8nText v-if="nodeName" size="medium" bold>{{ nodeName }}</N8nText>
			<N8nText v-if="themeLabel" size="small" color="text-light">{{ themeLabel }}</N8nText>
		</div>
		<div :class="$style.card">
			<iframe
				ref="iframeEl"
				:srcdoc="previewHtml"
				sandbox="allow-same-origin"
				scrolling="no"
				:class="$style.iframe"
				data-test-id="instance-ai-form-preview-iframe"
				@load="onIframeLoad"
			/>
		</div>
	</div>
</template>

<style module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.card {
	box-sizing: border-box;
	width: 100%;
	border: 1.5px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.iframe {
	display: block;
	width: 100%;
	border: none;
	pointer-events: none;
}
</style>
