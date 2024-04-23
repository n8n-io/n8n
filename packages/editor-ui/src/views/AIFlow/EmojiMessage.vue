<template>
	<div class="container">
		<span class="messageTop">
			<span class="emoji">
				<template v-if="props.type === 'agent'">
					🤖
				</template>
				<template v-if="props.type === 'thought'">
					💬
				</template>
			</span>
			<p class="title" v-text="title" />
		</span>
		<div class="content">
			<!-- <template v-if="props.type === 'thought'"> -->
				<VueMarkdown :source="jsonToMarkdown(props.content as JsonMarkdown)" class="markdown" />
			<!-- </template>
			<template v-else>
				{{ props.content }}
			</template> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import type { AddedNodesAndConnections } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import VueMarkdown from 'vue-markdown-render';

const emit = defineEmits<{
	(event: 'addNode', value: AddedNodesAndConnections): void;
}>();
const props = defineProps<{
	type: 'agent' | 'thought';
	title: string;
	content: string;
}>();

function formatToJsonMarkdown(data: string): string {
	return '```json\n' + data + '\n```';
}

type JsonMarkdown = string | object | Array<string | object>;
function isMarkdown(content: JsonMarkdown): boolean {
	if (typeof content !== 'string') return false;
	const markdownPatterns = [
		/^# .+/gm, // headers
		/\*{1,2}.+\*{1,2}/g, // emphasis and strong
		/\[.+\]\(.+\)/g, // links
		/```[\s\S]+```/g, // code blocks
	];

	return markdownPatterns.some((pattern) => pattern.test(content));
}
function jsonToMarkdown(data: JsonMarkdown): string {
	if (isMarkdown(data)) return data as string;

	if (Array.isArray(data) && data.length && typeof data[0] !== 'number') {
		const markdownArray = data.map((item: JsonMarkdown) => jsonToMarkdown(item));

		return markdownArray.join('\n\n').trim();
	}

	if (typeof data === 'string') {
		return formatToJsonMarkdown(data);
	}

	return formatToJsonMarkdown(JSON.stringify(data, null, 2));
}
</script>

<style scoped lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.messageTop {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
.content {
	overflow-wrap: anywhere;
}
.markdown {
	overflow: auto;
	& {
		white-space: pre-wrap;

		h1 {
			font-size: var(--font-size-xl);
			line-height: var(--font-line-height-xloose);
		}

		h2 {
			font-size: var(--font-size-l);
			line-height: var(--font-line-height-loose);
		}

		h3 {
			font-size: var(--font-size-m);
			line-height: var(--font-line-height-regular);
		}

		pre {
			background-color: var(--color-foreground-light);
			border-radius: var(--border-radius-base);
			line-height: var(--font-line-height-xloose);
			padding: var(--spacing-s);
			font-size: var(--font-size-s);
			white-space: pre-wrap;
		}
	}
}
</style>
