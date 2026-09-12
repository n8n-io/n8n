<script lang="ts" setup>
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import type MarkdownIt from 'markdown-it';
import markdownLink from 'markdown-it-link-attributes';
import VueMarkdown from 'vue-markdown-render';

defineProps<{
	text: string;
}>();

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('bash', bash);

const linksNewTabPlugin = (vueMarkdownItInstance: MarkdownIt) => {
	vueMarkdownItInstance.use(markdownLink, {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	});
};

// Explicit markdown-it options.
//
// The external web chat previously constructed markdown-it with no options, so it
// inherited library defaults (`html: true`, `linkify: false`, `breaks: false`).
// That combination let workflow/agent responses that interleave prose with
// list-like lines (e.g. lines beginning with "-", "*" or "+") be rendered as
// bulleted lists on nearly every line instead of staying in paragraph form.
//
// We pin the options explicitly:
//   - html: false     -> raw HTML in a model response is escaped, never injected
//   - linkify: false  -> only explicit links are turned into anchors
//   - breaks: false   -> a single newline is NOT turned into a hard <br>, so a
//                        paragraph that wraps across lines is kept as one block
//                        and only real markdown lists become <ul>/<ol>.
const markdownOptions = {
	html: false,
	linkify: false,
	breaks: false,
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}

		return ''; // use external default escaping
	},
};
</script>

<template>
	<VueMarkdown
		class="n8n-markdown chat-message-markdown"
		:source="text"
		:options="markdownOptions"
		:plugins="[linksNewTabPlugin]"
	/>
</template>

<style lang="scss">
.chat-message-markdown {
	display: block;
	box-sizing: border-box;
	font-size: inherit;

	> *:first-child {
		margin-top: 0;
	}

	> *:last-child {
		margin-bottom: 0;
	}

	pre {
		font-family: inherit;
		font-size: inherit;
		margin: 0;
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: var(--chat--spacing);
		background: var(--chat--message--pre--background);
		border-radius: var(--chat--border-radius);
	}
}
</style>
