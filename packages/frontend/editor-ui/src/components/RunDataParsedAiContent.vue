<script setup lang="ts">
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { type ParsedAiContent } from '@/utils/aiUtils';
import { type IDataObject } from 'n8n-workflow';
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import { computed } from 'vue';
import { createSearchHighlightPlugin } from '@/components/RunDataAi/utils';

import { N8nIconButton } from '@n8n/design-system';
import TextWithHighlights from '@/components/TextWithHighlights.vue';

const {
	content,
	compact = false,
	renderType,
	search,
} = defineProps<{
	content: ParsedAiContent;
	compact?: boolean;
	search?: string;
	renderType: 'rendered' | 'json';
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();

const vueMarkdownPlugins = computed(() => [createSearchHighlightPlugin(search)]);

function isJsonString(text: string) {
	try {
		JSON.parse(text);
		return true;
	} catch (e) {
		return false;
	}
}

const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}

		return undefined; // use external default escaping
	},
};

function isMarkdown(jsonMarkdown: JsonMarkdown): boolean {
	if (typeof jsonMarkdown !== 'string') return false;
	const markdownPatterns = [
		/^# .+/gm, // headers
		/\*{1,2}.+\*{1,2}/g, // emphasis and strong
		/\[.+\]\(.+\)/g, // links
		/```[\s\S]+```/g, // code blocks
	];

	return markdownPatterns.some((pattern) => pattern.test(jsonMarkdown));
}

function formatToJsonMarkdown(data: string): string {
	return '```json\n' + data + '\n```';
}

type JsonMarkdown = string | object | Array<string | object>;

function jsonToMarkdown(data: JsonMarkdown): string {
	if (isMarkdown(data)) return data as string;

	if (Array.isArray(data) && data.length && typeof data[0] !== 'number') {
		const markdownArray = data.map((item: JsonMarkdown) => jsonToMarkdown(item));

		return markdownArray.join('\n\n').trim();
	}

	if (typeof data === 'string') {
		// If data is a valid JSON string – format it as JSON markdown
		if (isJsonString(data)) {
			return formatToJsonMarkdown(data);
		}

		// Return original string otherwise
		return data;
	}

	return formatToJsonMarkdown(JSON.stringify(data, null, 2));
}

function onCopyToClipboard(object: IDataObject | IDataObject[]) {
	try {
		void clipboard.copy(JSON.stringify(object, undefined, 2));
		showMessage({
			title: i18n.baseText('generic.copiedToClipboard'),
			type: 'success',
		});
	} catch {}
}
</script>

<template>
	<div :class="[$style.component, compact ? $style.compact : '']">
		<div
			v-for="({ parsedContent, raw }, index) in content"
			:key="index"
			:class="$style.contentText"
			:data-content-type="parsedContent?.type"
		>
			<template v-if="parsedContent && renderType === 'rendered'">
				<VueMarkdown
					v-if="parsedContent.type === 'json'"
					:source="jsonToMarkdown(parsedContent.data as JsonMarkdown)"
					:class="$style.markdown"
					:options="markdownOptions"
					:plugins="vueMarkdownPlugins"
				/>
				<VueMarkdown
					v-else-if="parsedContent.type === 'markdown'"
					:source="parsedContent.data"
					:class="$style.markdown"
					:options="markdownOptions"
					:plugins="vueMarkdownPlugins"
				/>
				<TextWithHighlights
					v-else-if="parsedContent.type === 'text'"
					:class="$style.runText"
					:content="String(parsedContent.data)"
					:search="search"
				/>
			</template>
			<!-- We weren't able to parse text or raw switch -->
			<div v-else :class="$style.rawContent">
				<N8nIconButton
					size="small"
					:class="$style.copyToClipboard"
					type="secondary"
					:title="i18n.baseText('nodeErrorView.copyToClipboard')"
					icon="files"
					@click="onCopyToClipboard(raw)"
				/>
				<VueMarkdown
					:source="jsonToMarkdown(raw as JsonMarkdown)"
					:class="$style.markdown"
					:plugins="vueMarkdownPlugins"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.runText {
	line-height: var(--line-height--xl);
	white-space: pre-line;
}

.markdown {
	white-space: pre-wrap;

	h1 {
		font-size: var(--font-size--lg);
		line-height: var(--line-height--xl);
	}

	h2 {
		font-size: var(--font-size--md);
		line-height: var(--line-height--lg);
	}

	h3 {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--md);
	}

	pre {
		background: var(--chat--message--pre--background);
		border-radius: var(--radius);
		line-height: var(--line-height--xl);
		padding: var(--spacing--sm);
		font-size: var(--font-size--sm);
		white-space: pre-wrap;

		.compact & {
			padding: var(--spacing--3xs);
			font-size: var(--font-size--xs);
		}
	}

	p {
		.compact & {
			line-height: var(--line-height--xl);
		}
	}
}

.copyToClipboard {
	position: absolute;
	right: var(--spacing--sm);
	top: var(--spacing--sm);

	.compact & {
		right: var(--spacing--2xs);
		top: var(--spacing--2xs);
	}
}

.rawContent {
	position: relative;
}

.contentText {
	padding-top: var(--spacing--sm);
	padding-left: var(--spacing--md);
	padding-right: var(--spacing--md);
	font-size: var(--font-size--sm);

	.compact & {
		padding-top: 0;
		padding-inline: var(--spacing--2xs);
		font-size: var(--font-size--2xs);
	}
}
</style>
