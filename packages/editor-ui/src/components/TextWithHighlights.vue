<script lang="ts" setup>
import type { PropType } from 'vue';
import { GenericValue } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();

const props = defineProps({
    content: {
        type: [Object, String, Number] as PropType<GenericValue>,
    },
    search: {
        type: String,
    },
});

const splitTextBySearch = (text = '', search = ''): {tag: 'span' | 'mark', content: string}[] => {
	if (!search) {
		return [
			{
				tag: 'span',
				content: text,
			}
		]
	}

	const pattern = new RegExp(`(${search})`, 'g');
	const splitText = text.split(new RegExp(pattern, 'gi'));

	return splitText.map((t) => ({ tag: pattern.test(t)? 'mark' : 'span', content: t }));
}

</script>

<template>
    <span v-if="props.search && typeof props.content === 'string'">
        <template v-for="part in splitTextBySearch(props.content, props.search)">
            <mark v-if="part.tag === 'mark' && part.content">{{ part.content }}</mark>
            <span v-else-if="part.content">{{ part.content }}</span>
        </template>
    </span>
    <span v-else>{{ props.content }}</span>
</template>
