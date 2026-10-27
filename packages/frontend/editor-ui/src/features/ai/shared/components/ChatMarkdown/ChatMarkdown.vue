<script setup lang="ts">
import { N8nCodeBlock, N8nMarkdown } from '@n8n/design-system';
import type { PluginSimple } from 'markdown-it';
import ChatResourceLink from './ChatResourceLink.vue';
import { getResourceLinkIcon } from './resourceLinks';
import { useChatMarkdownOptions, type ChatMarkdownOptions } from './useChatMarkdownOptions';

const {
	content,
	options = {},
	singlePre = false,
	plugins = [],
} = defineProps<{
	content: string;
	options?: ChatMarkdownOptions;
	singlePre?: boolean;
	plugins?: PluginSimple[];
}>();
const markdown = useChatMarkdownOptions(options);
</script>

<template>
	<N8nMarkdown
		:content="content"
		class="n8n-markdown"
		:class="{ 'n8n-markdown--single-pre': singlePre }"
		:options="markdown.options"
		:plugins="[...markdown.plugins.value, ...plugins]"
	>
		<template #link="link">
			<ChatResourceLink
				v-if="getResourceLinkIcon(link.href)"
				v-bind="link"
				:icon="getResourceLinkIcon(link.href)"
			/>
			<a v-else :href="link.href" :title="link.title" :target="link.target" :rel="link.rel">
				{{ link.label }}
			</a>
		</template>
		<template #code-block="{ code, language }">
			<N8nCodeBlock :code="code" :language="language || 'auto'" />
		</template>
	</N8nMarkdown>
</template>

<style lang="scss">
@use '@n8n/design-system/css/markdown.scss';
</style>

<style scoped>
.n8n-markdown {
	--n8n-markdown--font-size--base: var(--chat--font-size);
	font-size: var(--n8n-markdown--font-size--base);
}
.n8n-markdown :deep(.n8n-markdown-footnote-block) {
	display: none;
}
</style>
