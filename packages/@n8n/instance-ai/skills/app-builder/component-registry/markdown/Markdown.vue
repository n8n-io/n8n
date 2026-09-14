<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

import { renderMarkdown } from './markdown';

const props = defineProps<{
	source: string;
	/** Render one line without a wrapping paragraph, e.g. inside a table cell. */
	inline?: boolean;
	class?: HTMLAttributes['class'];
}>();

const html = computed(() => renderMarkdown(props.source, props.inline));
</script>

<template>
	<component
		:is="inline ? 'span' : 'div'"
		:class="
			cn(
				'text-sm leading-relaxed break-words',
				'[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
				'[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0',
				'[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
				'[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
				'[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
				'[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
				'[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
				'[&_hr]:my-4 [&_hr]:border-border',
				'[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
				'[&_img]:max-w-full [&_img]:rounded-md',
				props.class,
			)
		"
		v-html="html"
	/>
</template>
