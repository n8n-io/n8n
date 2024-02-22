<script lang="ts" setup>
import type { PropType } from 'vue';
import type { GenericValue } from 'n8n-workflow';
import { computed } from 'vue';

const props = defineProps({
	content: {
		type: [Object, String, Number] as PropType<GenericValue>,
	},
	search: {
		type: String,
	},
});

const splitTextBySearch = (
	text = '',
	search = '',
): Array<{ tag: 'span' | 'mark'; content: string }> => {
	if (!search) {
		return [
			{
				tag: 'span',
				content: text,
			},
		];
	}

	const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	const pattern = new RegExp(`(${escapeRegExp(search)})`, 'i');
	const splitText = text.split(pattern);

	return splitText.map((t) => ({ tag: pattern.test(t) ? 'mark' : 'span', content: t }));
};

const parts = computed(() => {
	return props.search && typeof props.content === 'string'
		? splitTextBySearch(props.content, props.search)
		: [];
});
</script>

<template>
	<span v-if="parts.length && typeof props.content === 'string'">
		<template v-for="(part, index) in parts">
			<mark v-if="part.tag === 'mark' && part.content" :key="`mark-${index}`">{{
				part.content
			}}</mark>
			<span v-else-if="part.content" :key="`span-${index}`">{{ part.content }}</span>
		</template>
	</span>
	<span v-else>{{ props.content }}</span>
</template>
