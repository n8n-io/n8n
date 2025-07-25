<script lang="ts" setup>
/* StreamingOutput.vue - independent component for streaming text output */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import { computed, ref, onMounted } from 'vue';
import VueMarkdown from 'vue-markdown-render';

// Register languages for syntax highlighting
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('bash', bash);

// Props: simple message string
const props = defineProps<{ message: string }>();

// Container ref for auto-scroll
const messageContainer = ref<HTMLElement | null>(null);

// Compute markdown source (fallback if empty)
const messageText = computed(() => props.message || '<Empty response>');

// Plugin to open links in new tab
const linksNewTabPlugin = (md: MarkdownIt) => {
	md.use(markdownLink, {
		attrs: { target: '_blank', rel: 'noopener' },
	});
};

// Markdown-it options with syntax highlighting
const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}
		return '';
	},
};

// Scroll into view on mount
onMounted(() => {
	if (messageContainer.value) {
		messageContainer.value.scrollIntoView({ block: 'start' });
	}
});
</script>

<template>
	<div ref="messageContainer" class="chat-message chat-message-from-bot">
		<VueMarkdown
			class="chat-message-markdown"
			:source="messageText"
			:options="markdownOptions"
			:plugins="[linksNewTabPlugin]"
		/>
	</div>
</template>

<style lang="scss"></style>
